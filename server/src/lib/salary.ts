/**
 * Salario diario de los anfitriones.
 *
 * Un anfitrión que transmite lo suficiente y recibe bastantes regalos de la
 * suerte cobra un extra en diamantes, pagado por la plataforma. Es el sistema
 * que engancha a los anfitriones: les da un suelo por trabajar, independiente
 * de lo que caiga cada noche.
 *
 * ## Qué cuenta y qué no
 *
 * La meta se mide sobre las **monedas gastadas por los espectadores en regalos
 * de la suerte** dirigidos a ese anfitrión, no sobre los diamantes que él
 * recibe. Los exclusivos y los del club de fans **no cuentan**: ya dejan el 70%
 * a quien los recibe, así que sumarlos también aquí sería pagar dos veces.
 *
 * ## Cómo cuadran las cuentas
 *
 * Los regalos de la suerte devuelven el 84% de lo gastado, así que el
 * espectador recicla sus premios: para generar 150.000 monedas de volumen solo
 * recarga unas 24.000 de verdad. Aun así la plataforma sale ganando en todos los
 * niveles, porque cobra ese 16% real mientras solo paga el 5% en diamantes más
 * el salario.
 *
 * Un efecto secundario buscado: **autoregalarse no compensa**. Quien intente
 * llegar a la meta con su propio dinero pone más de lo que recupera entre
 * diamantes y salario, en todos los niveles.
 */

/** Horas de directo mínimas para cobrar. Sin esto, no hay salario. */
export const SEGUNDOS_MINIMOS_EN_VIVO = 2 * 3600;

/**
 * Zona horaria del corte, en horas respecto a UTC. Brasilia (UTC−3), como la
 * referencia del sector: el día se cierra a las 00:00 de esa hora.
 */
export const HUSO_CORTE = -3;

export interface Nivel {
  nivel: number;
  /** Monedas de regalos de la suerte que hay que reunir en el día. */
  meta: number;
  /** Diamantes que se pagan al alcanzarla. */
  salario: number;
}

/**
 * Tabla de salarios. Cada nivel exige más volumen y paga más; se cobra el del
 * nivel más alto alcanzado.
 */
export const NIVELES: Nivel[] = [
  { nivel: 1, meta: 150_000, salario: 10_000 },
  { nivel: 2, meta: 300_000, salario: 13_000 },
  { nivel: 3, meta: 600_000, salario: 18_000 },
  { nivel: 4, meta: 1_000_000, salario: 22_000 },
  { nivel: 5, meta: 1_500_000, salario: 28_000 },
  { nivel: 6, meta: 3_000_000, salario: 40_000 },
  { nivel: 7, meta: 5_000_000, salario: 60_000 },
  { nivel: 8, meta: 8_000_000, salario: 100_000 },
  { nivel: 9, meta: 12_000_000, salario: 160_000 },
  { nivel: 10, meta: 20_000_000, salario: 250_000 },
  { nivel: 11, meta: 30_000_000, salario: 400_000 },
  { nivel: 12, meta: 50_000_000, salario: 800_000 },
  { nivel: 13, meta: 100_000_000, salario: 2_000_000 },
];

/** El nivel alcanzado con ese volumen, o null si no llega ni al primero. */
export function nivelPara(luckyCoins: number): Nivel | null {
  let alcanzado: Nivel | null = null;
  for (const nivel of NIVELES) {
    if (luckyCoins >= nivel.meta) alcanzado = nivel;
  }
  return alcanzado;
}

/** El siguiente nivel por alcanzar, o null si ya está en el más alto. */
export function siguienteNivel(luckyCoins: number): Nivel | null {
  return NIVELES.find((nivel) => luckyCoins < nivel.meta) ?? null;
}

/**
 * El día al que pertenece un instante, como `YYYY-MM-DD` en la zona del corte.
 *
 * Se guarda como texto y no como fecha a propósito: un día del calendario no es
 * un instante, y usar `Date` obligaría a recordar en cada consulta a qué hora
 * empieza.
 */
export function diaDe(momento: Date = new Date()): string {
  const desplazado = new Date(momento.getTime() + HUSO_CORTE * 3600_000);
  return desplazado.toISOString().slice(0, 10);
}

/** Principio y fin de un día del calendario, en instantes UTC. */
export function limitesDelDia(dia: string): { desde: Date; hasta: Date } {
  const desde = new Date(`${dia}T00:00:00.000Z`).getTime() - HUSO_CORTE * 3600_000;
  return { desde: new Date(desde), hasta: new Date(desde + 24 * 3600_000) };
}
