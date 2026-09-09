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
 * que **va y viene despacio**, distinto para cada cuenta. En frío baja a 0,6 y
 * cuesta que toque; en caliente sube a 1,67 y explota sin parar.
 *
 * ## Por qué el rato bueno dura poco
 *
 * La curva se monta con **dos ondas**: una lenta de veinticinco segundos, que
 * marca el humor general, y otra rápida de doce y medio que la rompe por arriba.
 * Con una sola onda el tramo caliente duraba casi lo mismo que el tramo entero,
 * y eso deja jugar sobre seguro: se nota que está premiando, se dispara el
 * automático y se para antes de que se enfríe. Con las dos, el pico es estrecho
 * y el rato bueno **dura unos diez segundos**, uno cada cinco minutos.
 *
 * El techo también bajó por eso. Con 2,2 el regalo barato devolvía 1,87 mientras
 * durase la racha: las monedas se multiplicaban de verdad y valía la pena
 * vaciar el saldo ahí. Con 1,67 el mejor momento devuelve 1,42, que se nota pero
 * no compensa jugar a cronometrarlo. Y como el retorno baja con el precio, el
 * castillo ni siquiera llega a 1 en caliente.
 *
 * El exponente hace lo mismo por el lado del valor: estirar la parte alta de la
 * curva deja el máximo más arriba pero se pasa por él menos rato.
 *
 * ## Por qué la media sale 1
 *
 * El suelo y el techo los eligió el usuario; el **exponente** es el que sale de
 * despejar la media. Con 0,6 y 1,67 en los extremos y este reparto de ondas,
 * 1,527 es el valor que deja la media del factor en 1, y eso es lo que hace que la
 * suerte personal **añada variación sin mover el retorno a largo plazo**. Si se
 * toca cualquiera de las otras constantes hay que recalcularlo; la prueba «la
 * media del factor es 1» lo vigila.
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
const TRAMO_LENTO_MS = 25_000;
const TRAMO_RAPIDO_MS = 12_500;

/** Cuánto pesa la onda rápida. Más peso, picos más estrechos y más nerviosos. */
const PESO_RAPIDA = 0.3;

/**
 * Cuánto se estira la parte alta de la curva. Por encima de 1 los valores
 * grandes escasean, que es lo que acorta el rato bueno.
 */
const EXPONENTE = 1.527;

/** Extremos del factor. Ver «Por qué la media sale 1» antes de tocarlos. */
const MINIMO = 0.6;
const MAXIMO = 1.67;

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
 * Va de 0,6 a 1,67 y se mueve en curva: la suerte sube y baja suave en vez de a
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
