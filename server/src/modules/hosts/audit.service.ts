import { prisma } from '../../lib/prisma';
import { CURRENCY, GIFT_TIER_CHEST, GIFT_TIER_EXCLUSIVE } from '../../lib/constants';
import { GIFT_CATALOG } from '../../lib/gift-catalog';
import { expectedReturn, parseMultipliers } from '../../lib/lucky';

/**
 * Vigilancia: que el saldo de cada cuenta cuadre y que el juego no esté
 * regalando de más.
 *
 * ## Por qué cuadrar el saldo detecta trampas
 *
 * Cada moneda que entra o sale de una cuenta deja un movimiento en
 * `Transaction`: la de bienvenida, las recargas, lo gastado en regalos, los
 * premios y los cambios de diamantes. Si el saldo guardado en la cuenta no es la
 * suma de sus movimientos, esas monedas **aparecieron sin pasar por ninguna
 * puerta**: un fallo, una escritura a mano en la base de datos o alguien
 * tocando el servidor.
 *
 * Es una comprobación barata y difícil de esquivar: para falsearla habría que
 * inventarse también los movimientos, y entonces el rastro queda escrito.
 *
 * ## Por qué se vigila el retorno real
 *
 * El sorteo tiene un retorno esperado, y con suficientes envíos el real se le
 * parece. Si se separa mucho hacia arriba, o alguien encontró la forma de
 * repetir un premio, o hay un error de cálculo que está pagando de más. En los
 * dos casos se pierde dinero y no se nota en ningún otro sitio hasta que el
 * agujero es grande.
 */

/** Por debajo de esto la muestra es demasiado pequeña para sacar conclusiones. */
const ENVIOS_MINIMOS = 100;

/** Cuánto puede pasarse el retorno real del previsto antes de ser sospechoso. */
const MARGEN = 1.35;

export interface CuentaAuditada {
  id: string;
  username: string;
  displayName: string;
  isBanned: boolean;
  coins: number;
  /** Lo que dicen sus movimientos que debería tener. */
  monedasEsperadas: number;
  /** Positivo: tiene monedas que no salieron de ninguna parte. */
  descuadreMonedas: number;
  diamonds: number;
  diamantesEsperados: number;
  descuadreDiamantes: number;
}

/**
 * Compara el saldo de cada cuenta con la suma de sus movimientos.
 *
 * Devuelve solo las que no cuadran, de mayor descuadre a menor.
 */
export async function auditarCuentas(): Promise<{ revisadas: number; sospechosas: CuentaAuditada[] }> {
  const [usuarios, movimientos] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, username: true, displayName: true, coins: true, diamonds: true, isBanned: true },
    }),
    prisma.transaction.groupBy({ by: ['userId', 'currency'], _sum: { amount: true } }),
  ]);

  const sumas = new Map<string, { monedas: number; diamantes: number }>();
  for (const fila of movimientos) {
    const actual = sumas.get(fila.userId) ?? { monedas: 0, diamantes: 0 };
    if (fila.currency === CURRENCY.COINS) actual.monedas += fila._sum.amount ?? 0;
    else actual.diamantes += fila._sum.amount ?? 0;
    sumas.set(fila.userId, actual);
  }

  const sospechosas: CuentaAuditada[] = [];
  for (const usuario of usuarios) {
    const suma = sumas.get(usuario.id) ?? { monedas: 0, diamantes: 0 };
    const descuadreMonedas = usuario.coins - suma.monedas;
    const descuadreDiamantes = usuario.diamonds - suma.diamantes;
    if (descuadreMonedas === 0 && descuadreDiamantes === 0) continue;

    sospechosas.push({
      id: usuario.id,
      username: usuario.username,
      displayName: usuario.displayName,
      isBanned: usuario.isBanned,
      coins: usuario.coins,
      monedasEsperadas: suma.monedas,
      descuadreMonedas,
      diamonds: usuario.diamonds,
      diamantesEsperados: suma.diamantes,
      descuadreDiamantes,
    });
  }

  sospechosas.sort(
    (a, b) =>
      Math.abs(b.descuadreMonedas) + Math.abs(b.descuadreDiamantes) -
      (Math.abs(a.descuadreMonedas) + Math.abs(a.descuadreDiamantes)),
  );

  return { revisadas: usuarios.length, sospechosas };
}

export interface AvisoDeJuego {
  code: string;
  titulo: string;
  /** 'ok' | 'aviso' | 'alarma' */
  nivel: 'ok' | 'aviso' | 'alarma';
  real: number;
  previsto: number;
  envios: number;
  detalle: string;
}

/**
 * Compara lo que el juego está pagando de verdad con lo que debería pagar.
 *
 * Con pocos envíos el azar manda y cualquier conclusión sería ruido, así que
 * por debajo del mínimo se dice que no hay muestra en vez de inventarse un
 * veredicto.
 */
export async function saludDelJuego(): Promise<AvisoDeJuego[]> {
  const [suerte, cofresPorRegalo] = await Promise.all([
    prisma.giftSend.aggregate({
      where: { gift: { tier: { notIn: [GIFT_TIER_CHEST, GIFT_TIER_EXCLUSIVE] } } },
      _sum: { coinsSpent: true, coinsRewarded: true },
      _count: { _all: true },
    }),
    prisma.giftSend.groupBy({
      by: ['giftId'],
      where: { gift: { tier: GIFT_TIER_CHEST } },
      _sum: { coinsSpent: true, quantity: true },
      _count: { _all: true },
    }),
  ]);

  const avisos: AvisoDeJuego[] = [];

  const modelo = GIFT_CATALOG.find((gift) => gift.luckyChance > 0 && gift.tier !== GIFT_TIER_CHEST);
  const previstoSuerte = modelo ? expectedReturn(modelo.luckyChance, modelo.luckyMultipliers) : 0;
  const gastado = suerte._sum.coinsSpent ?? 0;
  const devuelto = suerte._sum.coinsRewarded ?? 0;
  avisos.push(
    veredicto({
      code: 'lucky-return',
      titulo: 'Retorno de los regalos de la suerte',
      real: gastado > 0 ? devuelto / gastado : 0,
      previsto: previstoSuerte,
      envios: suerte._count._all,
      unidad: 'del gasto vuelve en premios',
    }),
  );

  // Los cofres se miden distinto: lo que cuentan es cuántas veces su precio
  // entregan, y el precio no está en la fila sino en el catálogo.
  const codigosPorId = new Map<string, (typeof GIFT_CATALOG)[number]>();
  const cofresDb = await prisma.gift.findMany({
    where: { tier: GIFT_TIER_CHEST },
    select: { id: true, code: true },
  });
  for (const fila of cofresDb) {
    const delCatalogo = GIFT_CATALOG.find((gift) => gift.code === fila.code);
    if (delCatalogo) codigosPorId.set(fila.id, delCatalogo);
  }

  let entregado = 0;
  let costado = 0;
  let enviosCofre = 0;
  let previstoPesado = 0;
  for (const fila of cofresPorRegalo) {
    const cofre = codigosPorId.get(fila.giftId);
    if (!cofre) continue;
    const unidades = fila._sum.quantity ?? 0;
    const coste = unidades * cofre.priceCoins;
    entregado += fila._sum.coinsSpent ?? 0;
    costado += coste;
    enviosCofre += fila._count._all;

    const escalones = parseMultipliers(cofre.luckyMultipliers);
    const pesos = escalones.reduce((total, e) => total + e.weight, 0) || 1;
    const media = escalones.reduce((total, e) => total + e.multiplier * e.weight, 0) / pesos;
    previstoPesado += media * coste;
  }

  avisos.push(
    veredicto({
      code: 'chest-payout',
      titulo: 'Lo que entregan los cofres',
      real: costado > 0 ? entregado / costado : 0,
      previsto: costado > 0 ? previstoPesado / costado : 0,
      envios: enviosCofre,
      unidad: 'veces su precio',
    }),
  );

  return avisos;
}

function veredicto(datos: {
  code: string;
  titulo: string;
  real: number;
  previsto: number;
  envios: number;
  unidad: string;
}): AvisoDeJuego {
  const { code, titulo, real, previsto, envios, unidad } = datos;

  if (envios < ENVIOS_MINIMOS) {
    return {
      code,
      titulo,
      nivel: 'ok',
      real,
      previsto,
      envios,
      detalle: `Solo ${envios} envíos: hacen falta ${ENVIOS_MINIMOS} para que el número signifique algo.`,
    };
  }

  const nivel = real > previsto * MARGEN ? 'alarma' : real > previsto * 1.15 ? 'aviso' : 'ok';
  const detalle =
    nivel === 'alarma'
      ? `Está pagando ${(real / previsto).toFixed(2)} veces lo previsto. Con ${envios} envíos eso ya no es suerte: revisa el sorteo y quién está enviando.`
      : nivel === 'aviso'
        ? `Va por encima de lo previsto, pero dentro de lo que puede dar el azar con ${envios} envíos.`
        : `Normal: ${real.toFixed(3)} ${unidad}, previsto ${previsto.toFixed(3)}.`;

  return { code, titulo, nivel, real, previsto, envios, detalle };
}

/** Movimientos de una cuenta, para revisar de dónde salió cada moneda. */
export async function historialDe(userId: string, limit = 60) {
  const [usuario, movimientos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, coins: true, diamonds: true, isBanned: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  return { usuario, movimientos };
}

/** Corta o devuelve el acceso a una cuenta. El baneo se comprueba al entrar. */
export async function cambiarBaneo(userId: string, banear: boolean) {
  const usuario = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: banear },
    select: { id: true, username: true, isBanned: true },
  });
  return { usuario };
}
