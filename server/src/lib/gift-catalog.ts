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
 * - 2026-09-08: el ×500 sube a 0,099% (0,080% en los caros) → 0,63 y 0,53.
 *
 * El ×500 manda en la media: aporta 49.500 de los 62.980 puntos del reparto de
 * los baratos. Por eso subir su probabilidad obliga a bajar el resto, y por eso
 * los caros lo llevan más bajo.
 *
 * La prueba «retorno documentado» vigila que estos números no cambien por
 * accidente.
 */

/**
 * Escalones de premio y probabilidad de cada uno por unidad enviada, fijadas
 * por el usuario el 2026-09-08:
 *
 *   ×10 → 0,9%     ×20 → 0,064%     ×50 → 0,064%     ×500 → 0,099%
 *
 * Los pesos son esas mismas cifras en proporción y la suma, 1,127%, va aparte
 * en `PROBABILIDAD`.
 *
 * Media ponderada: (10×900 + 20×64 + 50×64 + 500×99) / 1127 = 55,88.
 */
const PREMIOS = '10:900,20:64,50:64,500:99';

/**
 * Los regalos caros llevan el ×500 algo más bajo, al 0,080%, para que no
 * devuelvan tan rápido: su unidad ya vale mucho, así que cada acierto pesa más
 * en monedas aunque la probabilidad sea parecida.
 *
 * Media ponderada: (10×900 + 20×64 + 50×64 + 500×80) / 1108 = 48,28.
 */
const PREMIOS_ALTOS = '10:900,20:64,50:64,500:80';

/** Probabilidad total de los regalos caros: 0,9 + 0,064 + 0,064 + 0,080. */
const PROBABILIDAD_ALTOS = 0.01108;

/**
 * Probabilidad de premio por unidad: la suma de los cuatro escalones.
 *
 * Con esta media de multiplicadores (55,88), el techo para que la economía
 * cierre está en el 1,8%. Aquí queda en 1,127%, o sea retorno 0,63.
 */
const PROBABILIDAD = 0.01127;

export const GIFT_CATALOG = [
  // 0,01127 × 55,88 = 0,63
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, image: null, tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,01108 × 48,28 = 0,53
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, image: null, tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD_ALTOS, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, image: null, tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD_ALTOS, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, image: null, tier: 'legendary', animation: 'fullscreen', luckyChance: PROBABILIDAD_ALTOS, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },

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
