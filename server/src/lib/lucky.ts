/**
 * Sorteo de los regalos con premio, al estilo de las apps del sector: una parte
 * de lo gastado vuelve al emisor en monedas.
 *
 * La tasa de retorno esperada de un regalo es `luckyChance × media de los
 * multiplicadores`. Se mantiene **por debajo de 1** a propósito: si fuese mayor,
 * enviar regalos saldría rentable y la economía se rompería. El catálogo
 * documenta la tasa de cada regalo en `server/src/scripts/seed.ts`.
 */

export function parseMultipliers(raw: string): number[] {
  return raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

/** Tasa de retorno esperada, para poder comprobarla en las pruebas. */
export function expectedReturn(chance: number, raw: string): number {
  const multipliers = parseMultipliers(raw);
  if (multipliers.length === 0 || chance <= 0) return 0;
  const average = multipliers.reduce((sum, value) => sum + value, 0) / multipliers.length;
  return chance * average;
}

export interface LuckyRoll {
  /** El mayor multiplicador que salió, o null si no tocó ninguno. */
  multiplier: number | null;
  /** Monedas que se devuelven al emisor, sumando todas las unidades premiadas. */
  coins: number;
  /** Cuántas unidades del envío salieron premiadas. */
  wins: number;
}

/**
 * Sortea el premio **unidad por unidad**.
 *
 * Enviar 50 rosas son 50 sorteos independientes, y lo que toque en cada uno se
 * suma. Antes se sorteaba una sola vez por envío, lo que hacía que mandar un
 * paquete grande valiera lo mismo que mandar uno solo: con la probabilidad de
 * la rosa, 50 unidades premian unas 16 veces de media en vez de una.
 *
 * `unitPrice` es lo que cuesta **una** unidad, porque el premio de cada una se
 * calcula sobre su propio precio. `random` se inyecta para poder fijarlo en las
 * pruebas; en producción es `Math.random`.
 */
export function rollLucky(
  unitPrice: number,
  quantity: number,
  chance: number,
  raw: string,
  random: () => number = Math.random,
): LuckyRoll {
  const multipliers = parseMultipliers(raw);
  if (multipliers.length === 0 || chance <= 0) return { multiplier: null, coins: 0, wins: 0 };

  let coins = 0;
  let wins = 0;
  let best: number | null = null;

  for (let i = 0; i < quantity; i += 1) {
    if (random() >= chance) continue;
    const multiplier = multipliers[Math.floor(random() * multipliers.length)] ?? multipliers[0]!;
    coins += Math.round(unitPrice * multiplier);
    wins += 1;
    if (best === null || multiplier > best) best = multiplier;
  }

  return { multiplier: best, coins, wins };
}
