import { GIFT_TIER_CHEST } from './constants';
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
 * - 2026-09-08: sube la base a 0,80 y aparecen las rachas globales.
 * - 2026-09-08: la base sube a 1,50% → 0,84.
 * - 2026-09-08: se quitan las rachas globales. Doblaban para todos a la vez, así
 *   que bastaba con guardar castillos para esos minutos y soltarlos de golpe. La
 *   variación se queda en la suerte personal, que no se puede cronometrar porque
 *   cada cuenta lleva la suya.
 * - 2026-09-08: la base baja a 1,25% → 0,70, porque con 0,84 más el 5% en
 *   diamantes quien se regalaba a sí mismo se mantenía casi sin gastar.
 *
 * El ×500 manda en la media: aporta 49.500 de los 62.980 puntos del reparto de
 * los baratos. Por eso subir su probabilidad obliga a bajar el resto, y por eso
 * los caros lo llevan más bajo.
 *
 * La prueba «retorno documentado» vigila que estos números no cambien por
 * accidente.
 */

/**
 * Escalones de premio y probabilidad de cada uno por unidad enviada:
 *
 *   ×10 → 1,168%   ×20 → 0,098%   ×50 → 0,079%   ×500 → 0,104%
 *
 * Los pesos son esas cifras en proporción; la suma va aparte en `PROBABILIDAD`.
 *
 * El ×500 bajó a la mitad y volvió a subir el mismo día, a 0,104%: al bajarlo se
 * notaba que los gordos habían desaparecido. Es el escalón que manda en la
 * media —aporta 42.500 de los 56.800 puntos del reparto—, así que moverlo mueve
 * el retorno del conjunto más que ningún otro. El ×10 se queda arriba, que es el
 * que se ve salir a menudo.
 *
 * Media ponderada: (10×950 + 20×80 + 50×64 + 500×85) / 1179 = 48,18.
 */
const PREMIOS = '10:950,20:80,50:64,500:85';

/**
 * Los regalos caros llevan el ×500 algo más bajo, al 0,085%: su unidad ya vale
 * mucho, así que cada acierto pesa más en monedas aunque la probabilidad sea
 * parecida.
 *
 * Media ponderada: (10×950 + 20×80 + 50×64 + 500×70) / 1164 = 42,35.
 */
const PREMIOS_ALTOS = '10:950,20:80,50:64,500:70';

/** Los caros van algo por debajo, para que no devuelvan tan rápido. */
const PROBABILIDAD_ALTOS = 0.0142;

/**
 * Probabilidad de premio por unidad: la suma de los cuatro escalones.
 *
 * Con la media de multiplicadores en 48,18, el retorno sale `probabilidad ×
 * 48,18`. Aquí queda en 1,45%: retorno 0,70.
 *
 * ## Historial del ajuste (2026-09-08)
 *
 * Con retorno 0,84 y el 5% que vuelve en diamantes, quien se regalaba a sí mismo
 * recuperaba 0,89 de cada moneda y podía seguir jugando casi sin gastar:
 * repetido hasta agotar el saldo, el **45% de una recarga acababa en diamantes
 * propios**, que son retirables. Bajó a 0,70, luego a 0,50 recortando el ×500 a
 * la mitad, y volvió a 0,70 al ver que sin gordos la mecánica se apagaba: el
 * ×500 quedó en 0,104% y la probabilidad base subió al 1,45%, así que se ven más
 * premios pequeños **y** los gordos siguen apareciendo. Con 0,70 el ciclo
 * devuelve 0,75 y la fuga es del 20%.
 *
 * La suerte personal (`lib/lucky-mood`) mueve la probabilidad real entre el
 * 0,73% y el 2,90% según el momento de cada cuenta, pero se reparte alrededor
 * de 1, así que esta cifra sigue siendo la del conjunto.
 */
const PROBABILIDAD = 0.0145;

/**
 * Regalos que todavía se ven con el emoji porque no hay ilustración suya.
 *
 * Está aquí y no como un comentario suelto para que la prueba que exige arte
 * pueda saltárselos a propósito: así añadir un regalo nuevo sin dibujo falla y
 * hay que decidirlo, en vez de que se cuele con el emoji sin que nadie lo note.
 */
export const SIN_ILUSTRACION = new Set(['clap', 'wink', 'star', 'candy']);

export const GIFT_CATALOG = [

  // Cofres. Siempre explotan: `luckyChance` es 1 y los pesos reparten cuál de
  // los escalones sale. El premio no vuelve al que envía, se lo queda quien lo
  // recibe, así que el multiplicador medio puede pasar de 1 sin que eso
  // fabrique monedas: es valor que cambia de manos, no que aparece.
  //
  //   bronce  media ×5,61      plata  media ×6,08      oro  media ×6,08
  //
  // Los escalones de ×10 para arriba subieron el 2026-09-08: con el reparto
  // anterior diez cofres seguidos se quedaban en los dos peldaños de abajo más
  // de una vez de cada tres, y el cofre dejaba de tener gracia. Ahora salen el
  // 18-21% de las veces, así que en diez cofres cae alguno el 86-91% de ellas.
  { code: 'chest-bronze', name: 'Cofre de bronce', emoji: '🎁', priceCoins: 1_000, image: 'chest-bronze', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '3:95000,5:60000,10:28000,14:9000,20:4500,100:140,200:40', minFanLevel: 0 },
  { code: 'chest-silver', name: 'Cofre de plata', emoji: '🎁', priceCoins: 5_000, image: 'chest-silver', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '4:110000,6:45000,10:22000,14:7000,20:3000,30:1100,50:350,120:45,300:10', minFanLevel: 0 },
  { code: 'chest-gold', name: 'Cofre de oro', emoji: '🎁', priceCoins: 10_000, image: 'chest-gold', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '4:220000,6:90000,10:44000,14:14000,20:6000,30:2200,50:700,140:60,400:14', minFanLevel: 0 },
  // Los de una y cinco monedas: el regalo que se manda por mandar algo, y el
  // que abre la puerta a los demás. En una sala vacía son los que rompen el
  // hielo, y de ahí sale el resto.
  { code: 'clap', name: 'Aplauso', emoji: '👏', priceCoins: 1, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'wink', name: 'Guiño', emoji: '😉', priceCoins: 1, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'star', name: 'Estrella', emoji: '⭐', priceCoins: 5, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'candy', name: 'Caramelo', emoji: '🍬', priceCoins: 5, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,0145 × 48,18 = 0,70
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, image: 'rose', tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, image: 'heart', tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, image: 'beer', tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, image: 'crown', tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, image: 'fireworks', tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,0148 × 48,28 = 0,71
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, image: 'ferrari', tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD_ALTOS, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, image: 'yacht', tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD_ALTOS, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, image: 'castle', tier: 'legendary', animation: 'fullscreen', luckyChance: PROBABILIDAD_ALTOS, luckyMultipliers: PREMIOS_ALTOS, minFanLevel: 0 },

  // Exclusivos: sin premio, solo espectáculo, y el 75% en diamantes para quien
  // los recibe. Se envían de uno en uno.
  //
  // Los que llevan `image` se dibujan con esa ilustración en vez de un emoji;
  // la app las tiene empaquetadas en `mobile/assets/gifts/`.
  { code: 'lion-imperial', name: 'León Imperial', emoji: '🦁', image: 'lion-imperial', priceCoins: 10_000, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'phoenix', name: 'Fénix', emoji: '🦅', priceCoins: 25_000, image: 'phoenix', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'galaxy', name: 'Galaxia', emoji: '🌌', priceCoins: 60_000, image: 'galaxy', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'dragon', name: 'Dragón', emoji: '🐉', priceCoins: 150_000, image: 'dragon', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  // Añadidos el 2026-09-08 con su arte: la escalera de exclusivos se alarga
  // hasta los tres millones, que es donde está la de Kako.
  { code: 'sea-king', name: 'Rey del Mar', emoji: '🐋', priceCoins: 300_000, image: 'sea-king', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'celestial-tower', name: 'Torre Celestial', emoji: '🏯', priceCoins: 500_000, image: 'celestial-tower', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'tesla', name: 'Tesla', emoji: '⚡', priceCoins: 1_000_000, image: 'tesla', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'universe', name: 'Universo', emoji: '🌀', priceCoins: 1_500_000, image: 'universe', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'golden-city', name: 'Ciudad Dorada', emoji: '🏙️', priceCoins: 2_000_000, image: 'golden-city', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },
  { code: 'phenomenon', name: 'Fenómeno', emoji: '🦁', priceCoins: 3_000_000, image: 'phenomenon', tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 0 },

  // Club de fans: se desbloquean por lo gastado con ese anfitrión, así que solo
  // los ve quien ya lleva tiempo con él. Como los exclusivos, dejan el 75%.
  { code: 'fan-bracelet', name: 'Pulsera de fan', emoji: '📿', priceCoins: 500, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 1 },
  { code: 'fan-jacket', name: 'Chaqueta del club', emoji: '🧥', priceCoins: 5_000, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 3 },
  { code: 'fan-throne', name: 'Trono del club', emoji: '🪑', priceCoins: 40_000, image: null, tier: 'exclusive', animation: 'aura', luckyChance: 0, luckyMultipliers: '', minFanLevel: 5 },
];
