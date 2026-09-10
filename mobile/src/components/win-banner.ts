import type { ImageSourcePropType } from 'react-native';

/**
 * La banda que enmarca un premio, con el color según lo gordo que sea.
 *
 * Es la misma lámina teñida cuatro veces. El marco dorado —cintas, monedas, la
 * caja— **no cambia nunca**: lo que cambia es la placa de dentro, que es como lo
 * hace Kako. Así se reconoce al instante que es un premio y a la vez se lee de
 * lejos cuánto de grande, sin tener que leer el número.
 *
 * Los cortes están donde la gente ya distingue los escalones: el ×500 es el
 * gordo de los regalos de la suerte y por eso se lleva el morado, que es el
 * color con el que se pidió; por encima quedan el oro y el rojo, que son los
 * cofres cuando revientan de verdad.
 */
export type NivelDePremio = 'blue' | 'purple' | 'gold' | 'red';

const BANDAS: Record<NivelDePremio, ImageSourcePropType> = {
  blue: require('../../assets/gifts/win-blue.png'),
  purple: require('../../assets/gifts/win-purple.png'),
  gold: require('../../assets/gifts/win-gold.png'),
  red: require('../../assets/gifts/win-red.png'),
};

/** Proporción de la lámina: hay que respetarla o el marco sale aplastado. */
export const PROPORCION_BANDA = 2.78;

/**
 * Dónde cae la placa dentro de la lámina, en tanto por uno. El texto va aquí
 * dentro; fuera se lo comen las cintas y las monedas.
 */
export const PLACA = { izquierda: 0.33, derecha: 0.1, arriba: 0.31, abajo: 0.18 };

export function nivelDePremio(times: number): NivelDePremio {
  if (times >= 1_000) return 'red';
  if (times >= 500) return 'gold';
  if (times >= 100) return 'purple';
  return 'blue';
}

export function bandaDePremio(times: number): ImageSourcePropType {
  return BANDAS[nivelDePremio(times)];
}

/**
 * Color del texto dentro de la placa, a juego con ella.
 *
 * El multiplicador llevaba su propio color por tamaño, y sobre la banda dorada
 * salía una pastilla morada que chocaba con el marco. Aquí el color lo manda la
 * banda: si la placa es oro, el número es oro.
 */
export const TINTA: Record<NivelDePremio, string> = {
  blue: '#9DEBFF',
  purple: '#DDBBFF',
  gold: '#FFE27A',
  red: '#FFB9A0',
};

export function tintaDePremio(times: number): string {
  return TINTA[nivelDePremio(times)];
}
