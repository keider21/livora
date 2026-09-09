import { prisma } from '../../lib/prisma';
import {
  COINS_PER_USD,
  CURRENCY,
  DIAMONDS_PER_USD,
  GIFT_TIER_EXCLUSIVE,
  TRANSACTION_TYPE,
} from '../../lib/constants';
import { COIN_PACKAGES } from '../wallet/wallet.service';

/**
 * Cómo va de dinero la aplicación.
 *
 * ## La cuenta que importa
 *
 * Solo entra dinero de verdad por una puerta: **las recargas**. Todo lo demás
 * que se mueve dentro —monedas ganadas, premios, monedas de bienvenida— es saldo
 * de juego que la app se inventa.
 *
 * Y solo sale por otra: **los diamantes**, que son lo único convertible en
 * dinero. Mientras un anfitrión los tenga guardados son una deuda pendiente,
 * aunque todavía no haya pedido cobrarlos.
 *
 * Así que la posición es `recargas − diamantes en circulación`, las dos en
 * dólares. Las **monedas no son deuda**: no se pueden retirar, solo gastar, así
 * que una cuenta con millones de monedas no debe nada; es dinero ya cobrado (o
 * regalado) esperando a convertirse en diamantes de otro.
 *
 * ## Dónde está el peligro
 *
 * En los diamantes que nacen de monedas que nadie compró. Una moneda de premio
 * o de bienvenida vale lo mismo que una comprada a la hora de generar diamantes,
 * pero detrás no hay ningún dólar. Por eso se separa cuánto del saldo en
 * circulación se pagó y cuánto se regaló: si la deuda crece más rápido que las
 * recargas, la diferencia sale de ahí.
 *
 * Los exclusivos son los que más pesan, porque dejan el 70% en diamantes frente
 * al 5% de los de la suerte. Por eso van desglosados.
 */
export async function estadisticasDeLaPlataforma() {
  const [
    saldos,
    recargas,
    premios,
    cambios,
    exclusivos,
    suerte,
    salarios,
    cuentas,
    mayores,
  ] = await Promise.all([
    prisma.user.aggregate({ _sum: { coins: true, diamonds: true } }),
    prisma.transaction.groupBy({
      by: ['reference'],
      where: { type: TRANSACTION_TYPE.TOPUP },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: { type: { in: [TRANSACTION_TYPE.GIFT_REWARD, TRANSACTION_TYPE.CHEST_PRIZE] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: TRANSACTION_TYPE.EXCHANGE, currency: CURRENCY.DIAMONDS },
      _sum: { amount: true },
    }),
    prisma.giftSend.aggregate({
      where: { gift: { tier: GIFT_TIER_EXCLUSIVE } },
      _sum: { diamondsEarned: true, coinsSpent: true },
    }),
    prisma.giftSend.aggregate({
      where: { gift: { tier: { not: GIFT_TIER_EXCLUSIVE } } },
      _sum: { diamondsEarned: true, coinsSpent: true },
    }),
    prisma.hostSalary.aggregate({ _sum: { diamonds: true } }),
    prisma.user.count(),
    prisma.user.findMany({
      where: { diamonds: { gt: 0 } },
      orderBy: { diamonds: 'desc' },
      take: 5,
      select: { displayName: true, username: true, diamonds: true },
    }),
  ]);

  // De cada recarga se recupera el precio real por el paquete que quedó anotado
  // en la referencia; el importe en monedas ya incluye el extra de regalo.
  let dolares = 0;
  let monedasCompradas = 0;
  for (const fila of recargas) {
    const id = fila.reference?.replace('package:', '') ?? '';
    const paquete = COIN_PACKAGES.find((item) => item.id === id);
    if (paquete) dolares += paquete.priceUsd * fila._count._all;
    monedasCompradas += fila._sum.amount ?? 0;
  }

  const monedasEnCirculacion = saldos._sum.coins ?? 0;
  const diamantesEnCirculacion = saldos._sum.diamonds ?? 0;
  const monedasDePremio = premios._sum.amount ?? 0;
  // El cambio se anota en negativo porque sale del saldo de diamantes.
  const diamantesCambiados = Math.abs(cambios._sum.amount ?? 0);

  const deuda = diamantesEnCirculacion / DIAMONDS_PER_USD;
  const posicion = dolares - deuda;

  return {
    /** Dinero real que ha entrado, por recargas. Hoy son simuladas. */
    caja: {
      dolares,
      recargas: recargas.reduce((total, fila) => total + fila._count._all, 0),
      monedasCompradas,
    },
    /** Lo que se debe: todo diamante guardado es dinero por pagar. */
    deuda: {
      diamantes: diamantesEnCirculacion,
      dolares: deuda,
    },
    posicion: {
      dolares: posicion,
      /**
       * Cuántas veces cubren las recargas la deuda. Por debajo de 1 se debe más
       * de lo que ha entrado. `null` cuando aún no hay deuda.
       */
      respaldo: diamantesEnCirculacion > 0 ? dolares / deuda : null,
    },
    monedas: {
      enCirculacion: monedasEnCirculacion,
      compradas: monedasCompradas,
      /** Monedas que la app se inventó: premios de la suerte y de los cofres. */
      dePremio: monedasDePremio,
      /** Diamantes que volvieron a ser monedas: dejaron de ser deuda. */
      deCambio: diamantesCambiados,
      /** Lo que queda: bienvenida y ajustes. Saldo sin ningún dólar detrás. */
      deRegalo: Math.max(
        0,
        monedasEnCirculacion - monedasCompradas - monedasDePremio - diamantesCambiados,
      ),
      /** Lo que valdrían las compradas, para comparar con la caja. */
      dolaresEquivalentes: monedasEnCirculacion / COINS_PER_USD,
    },
    diamantes: {
      enCirculacion: diamantesEnCirculacion,
      /** El 5% de los regalos de la suerte y los cofres. */
      porSuerte: suerte._sum.diamondsEarned ?? 0,
      /** El 70% de los exclusivos: son los que más deuda generan. */
      porExclusivos: exclusivos._sum.diamondsEarned ?? 0,
      porSalario: salarios._sum.diamonds ?? 0,
      cambiados: diamantesCambiados,
    },
    volumen: {
      /** Monedas movidas en regalos, que es lo que mide las metas. */
      enSuerte: suerte._sum.coinsSpent ?? 0,
      enExclusivos: exclusivos._sum.coinsSpent ?? 0,
    },
    gente: {
      cuentas,
      /** Quién acumula más deuda a nuestro favor. */
      mayores,
    },
  };
}
