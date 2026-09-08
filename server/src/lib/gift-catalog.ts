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
 * - 2026-09-08: probabilidades fijadas a mano por escalón, sin ×100 → 0,45.
 *
 * El ×500 manda en la media: aporta 8.000 de los 11.370 puntos del reparto. Por
 * eso subir su peso obliga a bajar la probabilidad general, y por eso los
 * regalos caros ya no llevan un tope aparte: con el retorno tan por debajo de 1,
 * un ×500 sobre un castillo (5 millones de monedas) sale una de cada 1.560
 * unidades y sigue costando más enviarlas que lo que paga.
 *
 * La prueba «retorno documentado» vigila que estos números no cambien por
 * accidente.
 */

/**
 * Escalones de premio y probabilidad de cada uno por unidad enviada, fijadas
 * por el usuario el 2026-09-08:
 *
 *   ×10 → 0,9%     ×20 → 0,064%     ×50 → 0,064%     ×500 → 0,064%
 *
 * Los pesos son esas mismas cifras en proporción (225:16:16:16) y la suma,
 * 1,092%, va aparte en `PROBABILIDAD`. El ×100 se quitó a petición suya.
 *
 * Media ponderada: (10×225 + 20×16 + 50×16 + 500×16) / 273 = 41,65.
 */
const PREMIOS = '10:225,20:16,50:16,500:16';

/**
 * Probabilidad de premio por unidad: la suma de los cuatro escalones.
 *
 * Con esta media de multiplicadores (41,65), el techo para que la economía
 * cierre está en el 2,4%. Aquí queda en 1,092%, o sea retorno 0,45: un premio
 * cada dos paquetes de 50, más o menos.
 */
const PROBABILIDAD = 0.01092;

export const GIFT_CATALOG = [
  // 0,01092 × 41,65 = 0,45
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, image: null, tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, image: null, tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, image: null, tier: 'legendary', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },

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
