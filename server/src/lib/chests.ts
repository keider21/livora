/**
 * Cofres: el juego de azar aparte de los regalos.
 *
 * Se paga un precio fijo y se abre uno; a veces devuelve monedas y la mayoría de
 * las veces no devuelve nada. A diferencia de los regalos, aquí **no hay
 * destinatario ni diamantes**: es solo el jugador contra la casa.
 *
 * ## Cómo se leen los premios
 *
 * `peso` es la probabilidad en tanto por ciento de que salga ese premio. La
 * suma de todos deja el resto en «nada», que es lo que ocurre la mayoría de las
 * veces: los premios empiezan en el triple de lo que cuesta el cofre, así que no
 * puede tocar siempre.
 *
 * ## La tasa de retorno
 *
 * `Σ(probabilidad × premio) / precio` es lo que devuelve el cofre de media, y en
 * los tres está en torno a 0,88: de cada 100 monedas metidas vuelven 88. Igual
 * que en los regalos, tiene que quedar por debajo de 1 o abrir cofres pasaría a
 * producir monedas en vez de gastarlas. La prueba «ningún cofre es rentable» lo
 * vigila.
 *
 * Los escalones altos —los de 100 veces el precio y más— pesan poquísimo a
 * propósito: son los que dan de qué hablar en la sala, pero si pesaran más se
 * comerían toda la media y habría que recortar los premios pequeños, que son los
 * que hacen que abrir cofres se sienta vivo.
 */

export interface PremioCofre {
  /** Monedas que devuelve. */
  monedas: number;
  /** Probabilidad de que salga, en tanto por ciento. */
  peso: number;
}

export interface Cofre {
  code: string;
  nombre: string;
  emoji: string;
  /** Lo que cuesta abrirlo. */
  precio: number;
  premios: PremioCofre[];
}

export const COFRES: Cofre[] = [
  {
    code: 'bronze',
    nombre: 'Cofre de bronce',
    emoji: '🟫',
    precio: 1_000,
    premios: [
      { monedas: 3_000, peso: 12 },
      { monedas: 5_000, peso: 6 },
      { monedas: 10_000, peso: 1.5 },
      { monedas: 14_000, peso: 0.35 },
      { monedas: 20_000, peso: 0.12 },
      { monedas: 100_000, peso: 0.005 },
      { monedas: 200_000, peso: 0.0015 },
    ],
  },
  {
    code: 'silver',
    nombre: 'Cofre de plata',
    emoji: '⚪',
    precio: 5_000,
    premios: [
      { monedas: 20_000, peso: 12 },
      { monedas: 30_000, peso: 4 },
      { monedas: 50_000, peso: 1 },
      { monedas: 70_000, peso: 0.2 },
      { monedas: 100_000, peso: 0.08 },
      { monedas: 150_000, peso: 0.03 },
      { monedas: 250_000, peso: 0.01 },
      { monedas: 600_000, peso: 0.0015 },
      { monedas: 1_500_000, peso: 0.0004 },
    ],
  },
  {
    code: 'gold',
    nombre: 'Cofre de oro',
    emoji: '🟡',
    precio: 10_000,
    premios: [
      { monedas: 40_000, peso: 12 },
      { monedas: 60_000, peso: 4 },
      { monedas: 100_000, peso: 1 },
      { monedas: 140_000, peso: 0.25 },
      { monedas: 200_000, peso: 0.08 },
      { monedas: 300_000, peso: 0.02 },
      { monedas: 500_000, peso: 0.005 },
      { monedas: 1_400_000, peso: 0.0002 },
      { monedas: 4_000_000, peso: 0.00005 },
    ],
  },
];

export function cofrePorCodigo(code: string): Cofre | undefined {
  return COFRES.find((cofre) => cofre.code === code);
}

/** Probabilidad de que un cofre devuelva algo, en tanto por ciento. */
export function probabilidadDePremio(cofre: Cofre): number {
  return cofre.premios.reduce((total, premio) => total + premio.peso, 0);
}

/** Lo que devuelve el cofre de media, por moneda metida. */
export function retornoDelCofre(cofre: Cofre): number {
  const esperado = cofre.premios.reduce((total, premio) => total + (premio.peso / 100) * premio.monedas, 0);
  return esperado / cofre.precio;
}

/**
 * Abre un cofre y devuelve lo que tocó, o 0.
 *
 * `random` se inyecta para poder fijarlo en las pruebas; en producción es
 * `Math.random`. Se recorre la lista acumulando pesos: cada premio ocupa su
 * franja del 0 al 100 y lo que sobra es el «nada».
 */
export function abrirCofre(cofre: Cofre, random: () => number = Math.random): number {
  let tirada = random() * 100;

  for (const premio of cofre.premios) {
    tirada -= premio.peso;
    if (tirada < 0) return premio.monedas;
  }

  return 0;
}
