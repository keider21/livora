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
 * casi no toca nada; en caliente sube a 1,65 y explota sin parar.
 *
 * ## Por qué la media sale 1
 *
 * El factor se reparte alrededor de 1 a propósito: `MINIMO + n × (MAXIMO −
 * MINIMO)` con `n` centrado en 0,5 da media 1 exacta. Así la suerte personal
 * **añade variación sin mover el retorno a largo plazo**, que es lo que mantiene
 * la economía cerrada. La prueba «la media del factor es 1» lo vigila.
 *
 * ## Por qué no se guarda nada
 *
 * El factor sale de la cuenta y del reloj, con un generador con semilla. No hay
 * estado que persistir ni temporizadores, sobrevive a un reinicio del servidor, y
 * dos peticiones seguidas del mismo usuario ven lo mismo.
 */

/**
 * Cuánto dura cada tramo de la curva. A minuto y medio la suerte cambiaba
 * demasiado despacio: quien pillaba una racha fría se pasaba varios paquetes
 * enteros sin ver un premio.
 */
const TRAMO_MS = 30_000;

/**
 * Extremos del factor. **La media de los dos tiene que ser 1**: es lo que hace
 * que la variación no mueva el retorno del conjunto, y cualquier cambio aquí
 * debe respetarlo.
 *
 * El suelo subió de 0,2 a 0,35 porque en frío se perdía demasiado. El techo baja
 * en la misma medida para conservar la media.
 */
const MINIMO = 0.35;
const MAXIMO = 1.65;

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

/**
 * Factor de suerte de una cuenta en un instante dado.
 *
 * Va de 0,35 a 1,65 y se mueve en curva: entre un tramo y el siguiente se
 * interpola, así que la suerte sube y baja suave en vez de a saltos. Cada cuenta
 * lleva la suya.
 */
export function factorSuerte(userId: string, ahora: Date = new Date()): number {
  const posicion = ahora.getTime() / TRAMO_MS;
  const tramo = Math.floor(posicion);

  const actual = ruido(userId, tramo);
  const siguiente = ruido(userId, tramo + 1);
  const n = actual + (siguiente - actual) * suavizar(posicion - tramo);

  return MINIMO + n * (MAXIMO - MINIMO);
}
