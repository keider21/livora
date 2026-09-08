/**
 * Suerte personal: cada cuenta tiene su propia racha, que sube y baja sola.
 *
 * Sin esto, cada unidad enviada tira por su cuenta y con independencia de las
 * demás, así que a la larga **todo el mundo converge a la misma media** y la
 * experiencia se vuelve plana: nadie tiene un buen día ni un mal día, solo el
 * promedio. Lo que engancha en las apps del sector es lo contrario: ratos en los
 * que revienta todo y ratos en los que no cae nada.
 *
 * Aquí eso se consigue con un factor que multiplica la probabilidad de premio y
 * que **va y viene despacio**, distinto para cada cuenta. En frío baja al 0,35 y
 * casi no toca nada; en caliente sube a 1,8 y explota sin parar.
 *
 * ## Por qué el rato bueno dura poco
 *
 * La curva se monta con **dos ondas**: una lenta de veinte segundos, que marca
 * el humor general, y otra rápida de diez que la rompe por arriba. Con una sola
 * onda el tramo caliente duraba casi lo mismo que el tramo entero, y eso deja
 * jugar sobre seguro: se nota que está premiando, se dispara el automático y se
 * para antes de que se enfríe. Con las dos ondas el pico es estrecho, así que el
 * rato bueno **dura unos diez segundos** y se acaba antes de que dé tiempo a
 * exprimirlo.
 *
 * El exponente hace lo mismo por el lado del valor: estirar la parte alta de la
 * curva deja el máximo más arriba pero se pasa por él menos rato.
 *
 * ## Por qué la media sale 1
 *
 * El suelo no es un número redondo: sale de despejar la media. Con el techo, el
 * exponente y el reparto de las dos ondas ya fijados, `MINIMO` es el único valor
 * que deja la media del factor en 1, y eso es lo que hace que la suerte personal
 * **añada variación sin mover el retorno a largo plazo**. Si se toca cualquiera
 * de las otras constantes hay que recalcularlo; la prueba «la media del factor
 * es 1» lo vigila.
 *
 * ## Por qué no se guarda nada
 *
 * El factor sale de la cuenta y del reloj, con un generador con semilla. No hay
 * estado que persistir ni temporizadores, sobrevive a un reinicio del servidor, y
 * dos peticiones seguidas del mismo usuario ven lo mismo.
 */

/**
 * Las dos ondas. La lenta manda —es el humor de la cuenta— y la rápida solo la
 * despeina lo justo para que los picos no se hagan mesetas.
 */
const TRAMO_LENTO_MS = 20_000;
const TRAMO_RAPIDO_MS = 10_000;

/** Cuánto pesa la onda rápida. Más peso, picos más estrechos y más nerviosos. */
const PESO_RAPIDA = 0.4;

/**
 * Cuánto se estira la parte alta de la curva. Por encima de 1 los valores
 * grandes escasean, que es lo que acorta el rato bueno.
 */
const EXPONENTE = 1.2;

/** Extremos del factor. Ver «Por qué la media sale 1» antes de tocarlos. */
const MINIMO = 0.35;
const MAXIMO = 1.8;

/**
 * Número estable entre 0 y 1 a partir de un texto y un tramo.
 *
 * Es un hash sencillo (FNV-1a) seguido de un revoltijo: no protege nada, solo
 * necesita repartir bien y dar siempre lo mismo para la misma entrada.
 */
function ruido(semilla: string, tramo: number): number {
  let h = 2166136261;
  const texto = `${semilla}:${tramo}`;

  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

/** Curva suave entre dos puntos: sin esto el factor daría saltos secos. */
function suavizar(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Una onda: ruido por tramos, interpolado para que no salte. */
function onda(semilla: string, milisegundos: number, tramoMs: number): number {
  const posicion = milisegundos / tramoMs;
  const tramo = Math.floor(posicion);

  const actual = ruido(semilla, tramo);
  const siguiente = ruido(semilla, tramo + 1);

  return actual + (siguiente - actual) * suavizar(posicion - tramo);
}

/**
 * Factor de suerte de una cuenta en un instante dado.
 *
 * Va de 0,35 a 1,8 y se mueve en curva: la suerte sube y baja suave en vez de a
 * saltos, pero el rato bueno es corto. Cada cuenta lleva la suya.
 */
export function factorSuerte(userId: string, ahora: Date = new Date()): number {
  const milisegundos = ahora.getTime();

  const lenta = onda(userId, milisegundos, TRAMO_LENTO_MS);
  // La onda rápida lleva su propia semilla: con la misma subirían y bajarían a la
  // vez y no romperían nada.
  const rapida = onda(`${userId}#rapida`, milisegundos, TRAMO_RAPIDO_MS);
  const n = lenta * (1 - PESO_RAPIDA) + rapida * PESO_RAPIDA;

  return MINIMO + Math.pow(n, EXPONENTE) * (MAXIMO - MINIMO);
}
