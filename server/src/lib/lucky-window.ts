/**
 * Rachas de suerte: ratos en los que los regalos premian más a menudo.
 *
 * Cuatro por hora, de dos a tres minutos cada una, en momentos que nadie puede
 * anticipar. Durante una racha la probabilidad de premio se multiplica; el resto
 * del tiempo se juega con la normal.
 *
 * **No se anuncian.** La gracia es que la gente las note por el ritmo de
 * premios, no que sepa cuándo empiezan y guarde las monedas para entonces.
 *
 * ## Por qué se calculan y no se guardan
 *
 * Las ventanas salen de la hora en curso a través de un generador con semilla:
 * la misma hora da siempre las mismas ventanas, así que no hace falta guardar
 * nada ni programar temporizadores. Sobrevive a un reinicio del servidor y, si
 * algún día hay varias instancias, todas coinciden sin hablar entre ellas.
 *
 * ## Efecto en la economía
 *
 * Con cuatro ventanas de dos minutos y medio de media, la racha ocupa un 17% del
 * tiempo. Al doble de probabilidad, el retorno medio queda en
 * `0,83 × normal + 0,17 × doble`, o sea un 17% por encima del normal: si fuera
 * de racha se devuelve 0,80 de lo gastado, de media a lo largo del día sale 0,93.
 */

/** Cuántas rachas hay en cada hora. */
const VENTANAS_POR_HORA = 4;
/** Duración de cada una, en minutos. */
const DURACION_MINIMA = 2;
const DURACION_MAXIMA = 3;

/** Cuánto se multiplica la probabilidad de premio mientras dura la racha. */
export const MULTIPLICADOR_RACHA = 2;

const MINUTOS_POR_BLOQUE = 60 / VENTANAS_POR_HORA;

export interface Ventana {
  /** Minuto de la hora en que empieza, de 0 a 59. */
  inicio: number;
  /** Minuto en que termina; puede pasar de 60 si cae al final de la hora. */
  fin: number;
}

/**
 * Generador con semilla (xorshift de 32 bits). Basta con que sea estable y
 * reparta bien: aquí no se protege nada, solo se decide cuándo hay racha.
 */
function generador(semilla: number): () => number {
  let estado = semilla || 1;
  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    return (estado >>> 0) / 4294967296;
  };
}

/**
 * Las cuatro ventanas de una hora concreta, identificada por las horas
 * transcurridas desde 1970.
 *
 * La hora se parte en cuatro bloques de quince minutos y en cada uno cae una
 * ventana en un momento al azar. Así hay siempre cuatro, nunca se solapan, y
 * aun así no se puede adivinar el minuto.
 */
export function ventanasDe(horaEpoch: number): Ventana[] {
  const azar = generador(horaEpoch * 2654435761);

  return Array.from({ length: VENTANAS_POR_HORA }, (_, bloque) => {
    const duracion = DURACION_MINIMA + azar() * (DURACION_MAXIMA - DURACION_MINIMA);
    const margen = MINUTOS_POR_BLOQUE - duracion;
    const inicio = bloque * MINUTOS_POR_BLOQUE + azar() * margen;
    return { inicio, fin: inicio + duracion };
  });
}

/** Si en este instante hay racha. */
export function hayRacha(ahora: Date = new Date()): boolean {
  const horaEpoch = Math.floor(ahora.getTime() / 3_600_000);
  const minuto = ahora.getMinutes() + ahora.getSeconds() / 60;

  return ventanasDe(horaEpoch).some((ventana) => minuto >= ventana.inicio && minuto < ventana.fin);
}

/**
 * Lo que multiplica la probabilidad de premio ahora mismo: 1 en tiempo normal,
 * `MULTIPLICADOR_RACHA` durante una racha.
 */
export function bonusRacha(ahora: Date = new Date()): number {
  return hayRacha(ahora) ? MULTIPLICADOR_RACHA : 1;
}
