/**
 * Catálogo de regalos.
 *
 * `luckyChance` y `luckyMultipliers` son los regalos con premio: al enviarlos se
 * sortea si devuelven monedas al emisor. La **tasa de retorno esperada** de cada
 * uno (probabilidad × media de multiplicadores) va anotada al lado y siempre
 * queda por debajo de 1: si pasara de 1, enviar ese regalo saldría rentable y la
 * economía se rompería. La prueba «ningún regalo es rentable» lo vigila.
 */
export const GIFT_CATALOG = [
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, tier: 'basic', animation: 'float', luckyChance: 0, luckyMultipliers: '' },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, tier: 'basic', animation: 'float', luckyChance: 0, luckyMultipliers: '' },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, tier: 'basic', animation: 'float', luckyChance: 0, luckyMultipliers: '' },
  // 0,10 × media(2, 5, 10) = 0,57
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, tier: 'rare', animation: 'burst', luckyChance: 0.1, luckyMultipliers: '2,5,10' },
  // 0,08 × media(2, 5, 20) = 0,72
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, tier: 'rare', animation: 'burst', luckyChance: 0.08, luckyMultipliers: '2,5,20' },
  // 0,03 × media(3, 10, 50) = 0,63
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, tier: 'epic', animation: 'fullscreen', luckyChance: 0.03, luckyMultipliers: '3,10,50' },
  // 0,015 × media(5, 20, 100) = 0,63
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, tier: 'epic', animation: 'fullscreen', luckyChance: 0.015, luckyMultipliers: '5,20,100' },
  // 0,005 × media(10, 50, 500) = 0,93
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, tier: 'legendary', animation: 'fullscreen', luckyChance: 0.005, luckyMultipliers: '10,50,500' },
];
