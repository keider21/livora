/**
 * Catálogo de regalos.
 *
 * ## Regalos con premio
 *
 * `luckyChance` y `luckyMultipliers` son los regalos que devuelven monedas al
 * emisor. Al enviarlos se sortea una vez **por unidad** y, si toca, vuelven
 * `precio de la unidad × multiplicador`.
 *
 * Los multiplicadores llevan peso (`"2:850,5:130,50:18,500:2"`): el ×500 existe
 * en casi todos, pero con un peso mínimo. Sin pesos, con todos igual de
 * probables, un ×500 dispararía el retorno esperado muy por encima de 1 y
 * enviar el regalo saldría rentable.
 *
 * La **tasa de retorno esperada** (probabilidad × media ponderada) va anotada al
 * lado de cada uno y siempre queda por debajo de 1. La prueba «ningún regalo del
 * catálogo es rentable» lo vigila.
 *
 * El premio gordo se paga sobre el precio de la unidad, así que escala solo con
 * el valor del regalo: un ×500 devuelve 5.000 monedas en una rosa y 5.000.000 en
 * un castillo. Por eso los caros llevan un tope más bajo.
 *
 * Historial de ajustes:
 * - 2026-09-06: los básicos estaban a 0% y parecía que la mecánica no existía.
 * - 2026-09-07: se añade el ×500 y se bajan las probabilidades, a petición del
 *   usuario. Los básicos pasan de ~30% a ~18%.
 *
 * ## Regalos exclusivos y de club de fans
 *
 * Los de tier `exclusive` **no premian nunca** a propósito: son los caros de
 * vitrina, dejan el 75% en diamantes a quien los recibe y lo que ofrecen es la
 * animación `aura`. Los del club se desbloquean por lo gastado con ese
 * anfitrión (`minFanLevel`).
 */

/** Reparto de premios de los regalos baratos: mucho ×2, rarísimo ×500. */
const PREMIOS_BAJOS = '2:850,5:130,50:18,500:2';
/** Los medios pagan más en las cifras altas porque su unidad ya cuesta. */
const PREMIOS_MEDIOS = '2:870,5:110,30:18,300:2';
/** Los caros topan más abajo: un ×500 sobre 9.999 monedas son 5 millones. */
const PREMIOS_ALTOS = '2:900,5:85,20:14,100:1';

export const GIFT_CATALOG = [
  // 0,18 × 4,25 = 0,77
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, tier: 'basic', animation: 'float', luckyChance: 0.18, luckyMultipliers: PREMIOS_BAJOS, minFanLevel: 0 },
  // 0,17 × 4,25 = 0,72
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, tier: 'basic', animation: 'float', luckyChance: 0.17, luckyMultipliers: PREMIOS_BAJOS, minFanLevel: 0 },
  // 0,16 × 4,25 = 0,68
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, tier: 'basic', animation: 'float', luckyChance: 0.16, luckyMultipliers: PREMIOS_BAJOS, minFanLevel: 0 },
  // 0,20 × 3,43 = 0,69
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, tier: 'rare', animation: 'burst', luckyChance: 0.2, luckyMultipliers: PREMIOS_MEDIOS, minFanLevel: 0 },
  // 0,19 × 3,43 = 0,65
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, tier: 'rare', animation: 'burst', luckyChance: 0.19, luckyMultipliers: PREMIOS_MEDIOS, minFanLevel: 0 },
  // 0,25 × 2,60 = 0,65
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, tier: 'epic', animation: 'fullscreen', luckyChance: 0.25, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  // 0,24 × 2,60 = 0,62
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, tier: 'epic', animation: 'fullscreen', luckyChance: 0.24, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  // 0,22 × 2,60 = 0,57
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, tier: 'legendary', animation: 'fullscreen', luckyChance: 0.22, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },

  // Exclusivos: sin premio, solo espectáculo, y el 75% en diamantes para quien
  // los recibe. Se envían de uno en uno.
  { code: 'phoenix', name: 'Fénix', emoji: '🦅', priceCoins: 25_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'galaxy', name: 'Galaxia', emoji: '🌌', priceCoins: 60_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'dragon', name: 'Dragón', emoji: '🐉', priceCoins: 150_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },

  // Club de fans: se desbloquean por lo gastado con ese anfitrión, así que solo
  // los ve quien ya lleva tiempo con él. Como los exclusivos, dejan el 75%.
  { code: 'fan-bracelet', name: 'Pulsera de fan', emoji: '📿', priceCoins: 500, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 1 },
  { code: 'fan-jacket', name: 'Chaqueta del club', emoji: '🧥', priceCoins: 5_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 3 },
  { code: 'fan-throne', name: 'Trono del club', emoji: '🪑', priceCoins: 40_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 5 },
];
