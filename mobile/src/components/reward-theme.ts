/**
 * Paleta y medidas del banner de recompensa.
 *
 * Todo lo que decide cómo se ve vive aquí, en un solo sitio, porque el banner se
 * dibuja con vistas y degradados en vez de con una lámina: cambiar el color de
 * un nivel es tocar tres valores, no exportar cuatro PNG.
 *
 * ## Por qué negro y oro, y no cuatro colores
 *
 * El oro es la identidad. Lo que cambia con el tamaño del premio no es el
 * esquema entero sino **el acento**: oro hasta ×500, ámbar encendido a partir de
 * ahí y rojo brasa en los de ×1000. Así se reconoce de lejos que es una
 * recompensa nuestra, y a la vez se lee sin números lo gordo que fue.
 *
 * El fondo es carbón en los tres, que es lo que le da al texto dorado el
 * contraste máximo. Un fondo que cambiase de color con el premio obligaría a
 * recalcular el contraste del texto en cada nivel.
 */

export type NivelDeRecompensa = 'oro' | 'ambar' | 'brasa';

export interface Paleta {
  /** Degradado del borde metálico, de claro a oscuro y otra vez a claro. */
  borde: readonly [string, string, string, string];
  /** Fondo interior, siempre carbón: el texto dorado necesita ese contraste. */
  fondo: readonly [string, string];
  /** Degradado del multiplicador, arriba claro y abajo ámbar. */
  cifra: readonly [string, string, string];
  /** Color de las partículas y los destellos. */
  chispa: string;
  /** Resplandor exterior que envuelve la composición. */
  halo: string;
  /** Cuántas partículas flotan. Un premio gordo mueve más aire. */
  particulas: number;
}

const ORO: Paleta = {
  borde: ['#7A5A12', '#F6D983', '#B8860B', '#FFF0B8'],
  fondo: ['#12100C', '#1C1710'],
  cifra: ['#FFF6D5', '#FFD24A', '#C9860A'],
  chispa: '#FFD98A',
  halo: 'rgba(255, 196, 74, 0.35)',
  particulas: 10,
};

const AMBAR: Paleta = {
  borde: ['#8A4A08', '#FFC46A', '#C2640A', '#FFE3A8'],
  fondo: ['#140D07', '#20140A'],
  cifra: ['#FFEFC8', '#FFA733', '#B34E05'],
  chispa: '#FFBE63',
  halo: 'rgba(255, 150, 40, 0.42)',
  particulas: 14,
};

const BRASA: Paleta = {
  borde: ['#7A1E0A', '#FF9A5E', '#B03A10', '#FFD2A8'],
  fondo: ['#160A07', '#23100B'],
  cifra: ['#FFE2CE', '#FF7A3C', '#A82D06'],
  chispa: '#FF9E63',
  halo: 'rgba(255, 96, 40, 0.48)',
  particulas: 18,
};

export function nivelDeRecompensa(times: number): NivelDeRecompensa {
  if (times >= 1_000) return 'brasa';
  if (times >= 500) return 'ambar';
  return 'oro';
}

export function paletaDeRecompensa(times: number): Paleta {
  const nivel = nivelDeRecompensa(times);
  if (nivel === 'brasa') return BRASA;
  if (nivel === 'ambar') return AMBAR;
  return ORO;
}

/**
 * Medidas del banner.
 *
 * La referencia era 8:1, y a ancho de móvil eso deja 45 px de alto donde no
 * caben tres niveles de texto. 4:1 conserva el aire horizontal y da sitio real
 * al nombre, al multiplicador y a la cantidad.
 */
export const BANNER = {
  ancho: 300,
  alto: 76,
  /** La moneda sobresale por la izquierda: es lo que le quita aire de recuadro. */
  moneda: 86,
} as const;
