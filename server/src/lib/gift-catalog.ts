/**
 * Catálogo de regalos.
 *
 * ## Regalos con premio
 *
 * `luckyChance` y `luckyMultipliers` son los regalos que devuelven monedas al
 * emisor. Al enviarlos se sortea una vez (no por unidad) y, si toca, vuelven
 * `monedas gastadas × multiplicador`.
 *
 * La **tasa de retorno esperada** (probabilidad × media de multiplicadores) va
 * anotada al lado de cada uno y siempre queda por debajo de 1: si pasara de 1,
 * enviar ese regalo saldría rentable y la economía se rompería. La prueba
 * «ningún regalo del catálogo es rentable» lo vigila.
 *
 * Las probabilidades se subieron el 2026-09-06: los regalos básicos estaban a
 * cero, así que quien solo mandaba rosas y corazones no veía un premio nunca y
 * parecía que la mecánica no existía. Ahora el más barato premia una de cada
 * tres veces, para que se entienda a la primera.
 *
 * ## Regalos exclusivos
 *
 * Los de tier `exclusive` **no premian nunca** (`luckyChance` 0) a propósito:
 * son los caros de vitrina, y lo que ofrecen es la animación `aura`, que llena
 * la pantalla con un halo y el nombre de quien lo envía en vez de la explosión
 * de emojis. En las apps del sector estos son los regalos de espectáculo, que
 * cuestan decenas de miles y se mandan para que se note.
 */
export const GIFT_CATALOG = [
  // 0,33 × 2 = 0,66
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, tier: 'basic', animation: 'float', luckyChance: 0.33, luckyMultipliers: '2' },
  // 0,30 × media(2, 3) = 0,75
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, tier: 'basic', animation: 'float', luckyChance: 0.3, luckyMultipliers: '2,3' },
  // 0,28 × media(2, 3) = 0,70
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, tier: 'basic', animation: 'float', luckyChance: 0.28, luckyMultipliers: '2,3' },
  // 0,22 × media(2, 3, 5) = 0,73
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, tier: 'rare', animation: 'burst', luckyChance: 0.22, luckyMultipliers: '2,3,5' },
  // 0,15 × media(2, 4, 8) = 0,70
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, tier: 'rare', animation: 'burst', luckyChance: 0.15, luckyMultipliers: '2,4,8' },
  // 0,10 × media(3, 5, 12) = 0,67
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, tier: 'epic', animation: 'fullscreen', luckyChance: 0.1, luckyMultipliers: '3,5,12' },
  // 0,06 × media(5, 10, 20) = 0,70
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, tier: 'epic', animation: 'fullscreen', luckyChance: 0.06, luckyMultipliers: '5,10,20' },
  // 0,03 × media(10, 25, 50) = 0,85
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, tier: 'legendary', animation: 'fullscreen', luckyChance: 0.03, luckyMultipliers: '10,25,50' },

  // Exclusivos: sin premio, solo espectáculo.
  { code: 'phoenix', name: 'Fénix', emoji: '🦅', priceCoins: 25_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '' },
  { code: 'galaxy', name: 'Galaxia', emoji: '🌌', priceCoins: 60_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '' },
  { code: 'dragon', name: 'Dragón', emoji: '🐉', priceCoins: 150_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '' },
];
