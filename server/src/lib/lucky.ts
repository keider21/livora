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
  /** Multiplicador premiado, o null si no tocó. */
  multiplier: number | null;
  /** Monedas que se devuelven al emisor. */
  coins: number;
}

/**
 * `random` se inyecta para poder fijarlo en las pruebas; en producción es
 * `Math.random`.
 */
export function rollLucky(
  coinsSpent: number,
  chance: number,
  raw: string,
  random: () => number = Math.random,
): LuckyRoll {
  const multipliers = parseMultipliers(raw);
  if (multipliers.length === 0 || chance <= 0) return { multiplier: null, coins: 0 };
  if (random() >= chance) return { multiplier: null, coins: 0 };

  const multiplier = multipliers[Math.floor(random() * multipliers.length)] ?? multipliers[0]!;
  return { multiplier, coins: Math.round(coinsSpent * multiplier) };
}
