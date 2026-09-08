/**
 * Catálogo de regalos.
 *
 * ## Regalos con premio
 *
 * `luckyChance` y `luckyMultipliers` son los regalos que devuelven monedas al
 * emisor. Al enviarlos se sortea una vez **por unidad** y, si toca, vuelven
 * `precio de la unidad × multiplicador`. Lo que se enseña en pantalla es la
 * **suma** de los multiplicadores que salieron: dos aciertos de ×500 son ×1000.
 *
 * Los multiplicadores llevan peso (`"10:930,25:45,500:3"`): el ×10 sale casi
 * siempre y el premio gordo es rarísimo. Sin pesos, con todos igual de
 * probables, el ×500 dominaría la media.
 *
 * ## La tasa de retorno, y por qué aquí pasa de 1
 *
 * Retorno esperado = `luckyChance × media ponderada de los multiplicadores`.
 * Por encima de 1, enviar un regalo devuelve más monedas de las que cuesta.
 *
 * Hasta el 2026-09-07 todos estaban por debajo de 1. Desde entonces el usuario
 * fija los escalones a mano para probar cómo se siente la mecánica, y el
 * retorno queda muy por encima: con ×500 saliendo una de cada diez unidades, la
 * media de los multiplicadores se dispara a 122 y el retorno a 55.
 *
 * Historial de ajustes:
 * - 2026-09-07: 33% de premio, mínimo ×10 → retorno 4,4.
 * - 2026-09-08: escalones fijos ×10/20%, ×20/15%, ×500/10% → retorno 55.
 *
 * Consecuencias, que el usuario conoce y aceptó:
 *
 * - Las monedas dejan de ser un recurso escaso. Quien envía sin parar acaba con
 *   más de las que compró.
 * - Como se puede regalar a uno mismo, el bucle no tiene techo: gastar y
 *   recuperar más deja además un 5% en diamantes cada vuelta, y los diamantes
 *   se retiran como dinero.
 *
 * Para volver a una economía cerrada hay que bajar sobre todo el peso del ×500,
 * que es quien manda en la media: con `10:4,20:3,500:0.02` la media cae a 16 y
 * un `luckyChance` del 6% dejaría el retorno en ~0,95. La prueba «retorno
 * documentado» vigila que estos números no cambien por accidente.
 */

/**
 * Escalones de premio y probabilidad de cada uno, por unidad enviada:
 *
 *   ×10 → 20%     ×20 → 15%     ×500 → 10%
 *
 * Suman un 45% de probabilidad de premio. Los pesos son relativos entre sí
 * (4:3:2), y el 45% va aparte en `luckyChance`.
 *
 * Media ponderada: (10×4 + 20×3 + 500×2) / 9 = 122,2.
 */
const PREMIOS = '10:4,20:3,500:2';

/**
 * Los caros pagan sobre una unidad que ya vale mucho, así que su tope baja a
 * ×100: un ×500 sobre 9.999 monedas serían cinco millones de golpe.
 * Media ponderada: (10×4 + 20×3 + 100×2) / 9 = 33,3.
 */
const PREMIOS_ALTOS = '10:4,20:3,100:2';

/** Probabilidad de premio por unidad, la suma de los tres escalones. */
const PROBABILIDAD = 0.45;

export const GIFT_CATALOG = [
  // 0,45 × 122,2 = 55,0
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,45 × 33,3 = 15,0
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, image: null, tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, image: null, tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, image: null, tier: 'legendary', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },

  // Exclusivos: sin premio, solo espectáculo, y el 75% en diamantes para quien
  // los recibe. Se envían de uno en uno.
  //
  // Los que llevan `image` se dibujan con esa ilustración en vez de un emoji;
  // la app las tiene empaquetadas en `mobile/assets/gifts/`.
  { code: 'lion-imperial', name: 'León Imperial', emoji: '🦁', image: 'lion-imperial', priceCoins: 10_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'phoenix', name: 'Fénix', emoji: '🦅', priceCoins: 25_000, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'galaxy', name: 'Galaxia', emoji: '🌌', priceCoins: 60_000, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'dragon', name: 'Dragón', emoji: '🐉', priceCoins: 150_000, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },

  // Club de fans: se desbloquean por lo gastado con ese anfitrión, así que solo
  // los ve quien ya lleva tiempo con él. Como los exclusivos, dejan el 75%.
  { code: 'fan-bracelet', name: 'Pulsera de fan', emoji: '📿', priceCoins: 500, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 1 },
  { code: 'fan-jacket', name: 'Chaqueta del club', emoji: '🧥', priceCoins: 5_000, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 3 },
  { code: 'fan-throne', name: 'Trono del club', emoji: '🪑', priceCoins: 40_000, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 5 },
];
