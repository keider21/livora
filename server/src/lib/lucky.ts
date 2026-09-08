/**
 * Sorteo de los regalos con premio, al estilo de las apps del sector: una parte
 * de lo gastado vuelve al emisor en monedas.
 *
 * Los multiplicadores llevan **peso**, escritos como `"2:850,5:130,50:18,500:2"`:
 * el primero es cuánto multiplica y el segundo lo probable que es respecto a los
 * demás. Sin pesos, con todos igual de probables, meter un ×500 en la lista
 * dispararía el retorno esperado por encima de 1 y enviar ese regalo saldría
 * rentable. Con pesos, el premio gordo puede existir siendo rarísimo.
 *
 * Se admite también la forma antigua sin peso (`"2,5,10"`), que equivale a que
 * todos pesen lo mismo.
 *
 * La tasa de retorno esperada de un regalo es
 * `luckyChance × media ponderada de los multiplicadores`, y se mantiene **por
 * debajo de 1** a propósito. El catálogo documenta la de cada regalo en
 * `server/src/lib/gift-catalog.ts`.
 */

export interface WeightedMultiplier {
  multiplier: number;
  weight: number;
}

export function parseMultipliers(raw: string): WeightedMultiplier[] {
  return raw
    .split(',')
    .map((part) => {
      const [valor, peso] = part.split(':');
      const multiplier = Number(valor?.trim());
      // Sin peso escrito, todos valen lo mismo.
      const weight = peso === undefined ? 1 : Number(peso.trim());
      return { multiplier, weight };
    })
    .filter(({ multiplier, weight }) => Number.isFinite(multiplier) && multiplier > 0 && Number.isFinite(weight) && weight > 0);
}

/** Tasa de retorno esperada, para poder comprobarla en las pruebas. */
export function expectedReturn(chance: number, raw: string): number {
  const multipliers = parseMultipliers(raw);
  if (multipliers.length === 0 || chance <= 0) return 0;

  const pesoTotal = multipliers.reduce((total, item) => total + item.weight, 0);
  const media = multipliers.reduce((total, item) => total + item.multiplier * item.weight, 0) / pesoTotal;
  return chance * media;
}

export interface LuckyRoll {
  /** El mayor multiplicador que salió, o null si no tocó ninguno. */
  multiplier: number | null;
  /** Monedas que se devuelven al emisor, sumando todas las unidades premiadas. */
  coins: number;
  /** Cuántas unidades del envío salieron premiadas. */
  wins: number;
  /**
   * Suma de los multiplicadores premiados: dos aciertos de ×500 son 1000. Es lo
   * que se enseña en grande, no el mejor de ellos.
   */
  times: number;
}

/** Elige un multiplicador respetando los pesos. */
function pickMultiplier(multipliers: WeightedMultiplier[], random: number): number {
  const pesoTotal = multipliers.reduce((total, item) => total + item.weight, 0);
  let restante = random * pesoTotal;
  for (const item of multipliers) {
    restante -= item.weight;
    if (restante < 0) return item.multiplier;
  }
  return multipliers[multipliers.length - 1]!.multiplier;
}

/**
 * Sortea el premio **unidad por unidad**.
 *
 * Enviar 50 rosas son 50 sorteos independientes, y lo que toque en cada uno se
 * suma. Antes se sorteaba una sola vez por envío, lo que hacía que mandar un
 * paquete grande valiera lo mismo que mandar uno solo.
 *
 * `unitPrice` es lo que cuesta **una** unidad, porque el premio de cada una se
 * calcula sobre su propio precio: así el ×500 de un castillo devuelve mucho más
 * que el de una rosa, sin necesidad de listas distintas. `random` se inyecta
 * para poder fijarlo en las pruebas; en producción es `Math.random`.
 */
export function rollLucky(
  unitPrice: number,
  quantity: number,
  chance: number,
  raw: string,
  random: () => number = Math.random,
): LuckyRoll {
  const multipliers = parseMultipliers(raw);
  if (multipliers.length === 0 || chance <= 0) return { multiplier: null, coins: 0, wins: 0, times: 0 };

  let coins = 0;
  let wins = 0;
  let times = 0;
  let best: number | null = null;

  for (let i = 0; i < quantity; i += 1) {
    if (random() >= chance) continue;
    const multiplier = pickMultiplier(multipliers, random());
    coins += Math.round(unitPrice * multiplier);
    wins += 1;
    times += multiplier;
    if (best === null || multiplier > best) best = multiplier;
  }

  return { multiplier: best, coins, wins, times };
}
