import { prisma } from '../../lib/prisma';
import {
  COINS_PER_USD,
  CURRENCY,
  DIAMONDS_PER_COIN,
  DIAMONDS_PER_COIN_EXCLUSIVE,
  DIAMONDS_PER_USD,
  GIFT_TIER_CHEST,
  GIFT_TIER_EXCLUSIVE,
  TRANSACTION_TYPE,
} from '../../lib/constants';
import { GIFT_CATALOG } from '../../lib/gift-catalog';
import { expectedReturn, parseMultipliers } from '../../lib/lucky';
import { SEGUNDOS_MINIMOS_EN_VIVO, diaDe, limitesDelDia, nivelPara, salarioPara } from '../../lib/salary';
import { COIN_PACKAGES } from '../wallet/wallet.service';

/**
 * Cuántos diamantes acaba generando una moneda según en qué se gaste.
 *
 * No es el porcentaje del regalo: hay que seguir la moneda hasta que se agota.
 *
 * - **Exclusivo:** no devuelve nada, así que la moneda se gasta una vez y deja
 *   el 70%. Es el camino más caro con diferencia.
 * - **Suerte:** devuelve el 85%, así que la misma moneda se vuelve a gastar una
 *   y otra vez. El volumen total es `1 / (1 − retorno)` y sobre él cae el 5%.
 *   Contar solo el 5% de la primera vuelta subestima el coste por seis.
 * - **Cofre:** siempre explota y entrega varias veces su precio en valor de
 *   regalo, y el 5% se calcula sobre eso.
 */
function diamantesPorMoneda() {
  const suerte = GIFT_CATALOG.find((gift) => gift.luckyChance > 0 && gift.tier !== GIFT_TIER_CHEST);
  const retorno = suerte ? expectedReturn(suerte.luckyChance, suerte.luckyMultipliers) : 0;

  const cofre = GIFT_CATALOG.find((gift) => gift.tier === GIFT_TIER_CHEST);
  const escalones = cofre ? parseMultipliers(cofre.luckyMultipliers) : [];
  const pesos = escalones.reduce((total, e) => total + e.weight, 0) || 1;
  const mediaCofre = escalones.reduce((total, e) => total + e.multiplier * e.weight, 0) / pesos;

  return {
    retorno,
    exclusivos: DIAMONDS_PER_COIN_EXCLUSIVE,
    suerte: retorno < 1 ? DIAMONDS_PER_COIN / (1 - retorno) : DIAMONDS_PER_COIN_EXCLUSIVE,
    cofres: mediaCofre * DIAMONDS_PER_COIN,
  };
}

/**
 * Lo que habría que pagar hoy en salarios si el día se cerrase ahora.
 *
 * Cada anfitrión va por su nivel, así que no vale multiplicar: se agrupa lo
 * recibido por persona, se busca el escalón de cada una y se suman los pagos.
 * Los que llegaron a meta pero aún no tienen las dos horas van aparte, porque
 * ese dinero todavía puede no salir —o salir si siguen transmitiendo—, y las dos
 * cifras juntas son el techo del día.
 */
async function salariosDelDia() {
  const dia = diaDe();
  const { desde, hasta } = limitesDelDia(dia);

  const [porAnfitrion, salas] = await Promise.all([
    prisma.giftSend.groupBy({
      by: ['receiverId'],
      where: { createdAt: { gte: desde, lt: hasta }, gift: { tier: { not: GIFT_TIER_EXCLUSIVE } } },
      _sum: { coinsSpent: true },
    }),
    prisma.room.findMany({
      where: { startedAt: { lt: hasta }, OR: [{ endedAt: null }, { endedAt: { gt: desde } }] },
      select: { hostId: true, startedAt: true, endedAt: true },
    }),
  ]);

  const ahora = new Date();
  const segundos = new Map<string, number>();
  for (const sala of salas) {
    const inicio = Math.max(sala.startedAt.getTime(), desde.getTime());
    const fin = Math.min((sala.endedAt ?? ahora).getTime(), hasta.getTime());
    segundos.set(sala.hostId, (segundos.get(sala.hostId) ?? 0) + Math.max(0, Math.round((fin - inicio) / 1000)));
  }

  let conMeta = 0;
  let aPagar = 0;
  let sinHoras = 0;
  let monedas = 0;

  for (const fila of porAnfitrion) {
    const luckyCoins = fila._sum.coinsSpent ?? 0;
    monedas += luckyCoins;
    const nivel = nivelPara(luckyCoins);
    if (!nivel) continue;

    conMeta += 1;
    const salario = salarioPara(luckyCoins);
    if ((segundos.get(fila.receiverId) ?? 0) >= SEGUNDOS_MINIMOS_EN_VIVO) aPagar += salario;
    else sinHoras += salario;
  }

  return { dia, conMeta, aPagar, sinHoras, monedas, anfitriones: porAnfitrion.length };
}

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
 *
 * ## La exposición: lo que las monedas pueden llegar a costar
 *
 * Que las monedas no sean deuda **hoy** no significa que no lo vayan a ser. Cada
 * moneda en circulación acabará gastada, y al gastarse fabrica diamantes. Por
 * eso va aparte una estimación de en cuánto se convertirían las monedas que hay
 * ahora mismo, según en qué se gasten: es lo que hay que tener preparado para
 * pagar, no lo que se debe ya.
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
    metas,
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
    salariosDelDia(),
  ]);

  // De cada recarga se recupera el precio real por el paquete que quedó anotado
  // en la referencia; el importe en monedas ya incluye el extra de regalo.
  let dolares = 0;
  let monedasCompradas = 0;
  for (const fila of recargas) {
    const id = fila.reference?.replace('package:', '') ?? '';
    const paquete = COIN_PACKAGES.find((item) => item.id === id);
    // Las de bienvenida y las del reinicio también son movimientos de tipo
    // «topup», pero no las pagó nadie: solo cuentan las que traen paquete.
    if (!paquete) continue;
    dolares += paquete.priceUsd * fila._count._all;
    monedasCompradas += fila._sum.amount ?? 0;
  }

  const monedasEnCirculacion = saldos._sum.coins ?? 0;
  const diamantesEnCirculacion = saldos._sum.diamonds ?? 0;
  const monedasDePremio = premios._sum.amount ?? 0;
  // El cambio se anota en negativo porque sale del saldo de diamantes.
  const diamantesCambiados = Math.abs(cambios._sum.amount ?? 0);

  const deuda = diamantesEnCirculacion / DIAMONDS_PER_USD;
  const posicion = dolares - deuda;

  // En cuántos diamantes se convertirían las monedas que hay ahora, según el
  // camino que tomen. Es la deuda que todavía no ha nacido.
  const tasas = diamantesPorMoneda();
  const enDolares = (monedas: number, tasa: number) => (monedas * tasa) / DIAMONDS_PER_USD;

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
    /**
     * Lo que las monedas de hoy pueden acabar costando. No es deuda todavía,
     * es lo que hay que tener preparado.
     */
    exposicion: {
      monedas: monedasEnCirculacion,
      /** Todo en exclusivos: el camino más caro, el 70% de una sola vez. */
      siExclusivos: enDolares(monedasEnCirculacion, tasas.exclusivos),
      /** Todo en cofres: siempre explotan y el 5% cae sobre lo que entregan. */
      siCofres: enDolares(monedasEnCirculacion, tasas.cofres),
      /**
       * Todo en regalos de la suerte. Cuenta las vueltas: como devuelven el
       * 85%, la misma moneda se gasta muchas veces antes de agotarse.
       */
      siSuerte: enDolares(monedasEnCirculacion, tasas.suerte),
      retorno: tasas.retorno,
    },
    /**
     * Salarios del día en curso, sumando el nivel de cada anfitrión por
     * separado: no todos van por la misma meta.
     */
    metas,
    gente: {
      cuentas,
      /** Quién acumula más deuda a nuestro favor. */
      mayores,
    },
  };
}
