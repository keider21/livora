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
 * El mínimo de ×10 obliga a que la probabilidad sea baja: con premios que
 * pagan diez veces como poco, cualquier probabilidad por encima del 9% deja el
 * retorno por encima de 1.
 *
 * Historial de ajustes, todos a petición del usuario mientras probaba:
 * - 2026-09-07: 33% de premio, mínimo ×10 → retorno 4,4.
 * - 2026-09-08: escalones ×10/20%, ×20/15%, ×500/10% → retorno 55.
 * - 2026-09-08: al ver que devolvía más de lo gastado, baja al 7% → 0,85.
 * - 2026-09-08: se baja al 4% y se añade el escalón ×50 → 0,77.
 *
 * El precio de que el retorno cierre es que el ×500 se vuelve raro: sale una
 * de cada 4.600 unidades enviadas. No hay forma de que salga a menudo y que la
 * economía cierre a la vez, porque es él quien manda en la media.
 *
 * La prueba «retorno documentado» vigila que estos números no cambien por
 * accidente.
 */

/**
 * Escalones de premio, con su peso relativo: ×10, ×20, ×50, ×100 y ×500.
 *
 * El ×10 sigue siendo el más común, pero mucho menos dominante que antes: al
 * quitarle peso, los escalones altos salen relativamente más y la cifra de
 * pantalla se mueve más a menudo.
 *
 * Media ponderada: (10×100 + 20×22 + 50×8 + 100×4 + 500×0,7) / 134,7 = 19,23.
 */
const PREMIOS = '10:100,20:22,50:8,100:4,500:0.7';

/**
 * Los caros pagan sobre una unidad que ya vale mucho, así que se quedan sin el
 * ×500: sobre 9.999 monedas serían cinco millones de golpe.
 * Media ponderada: (10×100 + 20×22 + 50×8 + 100×4) / 134 = 16,72.
 */
const PREMIOS_ALTOS = '10:100,20:22,50:8,100:4';

/**
 * Probabilidad de premio por unidad.
 *
 * Con el mínimo en ×10, este número es el que decide si la economía cierra: por
 * encima del 5% el retorno pasa de 1 y enviar regalos produce monedas en vez de
 * gastarlas.
 *
 * Al 4% quedan unos 2 premios por cada paquete de 50, y el retorno en 0,77.
 */
const PROBABILIDAD = 0.04;

export const GIFT_CATALOG = [
  // 0,04 × 19,23 = 0,77
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,04 × 16,72 = 0,67
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
