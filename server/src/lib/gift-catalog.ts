import { GIFT_TIER_CHEST } from './constants';
import { expectedReturn } from './lucky';
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
 * Repartidos así: el ×10 se lleva el 80% de los aciertos, el ×20 el 6,8%, el
 * ×50 el 5,4% y el ×500 el 7,2%. En un regalo barato eso son 1,76% de premio por
 * unidad; en el castillo, 1,20%.
 *
 * Los pesos son esas cifras en proporción; cada regalo la escala con la suya
 * según lo que cuesta, en `RETORNO_POR_PRECIO`.
 *
 * **La misma escalera para todos los regalos de la suerte.** Los caros tuvieron
 * una aparte, con el ×500 más bajo, hasta que se vio lo que provocaba: el
 * castillo devolvía menos que la rosa y se sentía peor mandar el regalo grande,
 * que es justo el que tiene que sentirse mejor.
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
 * Cuánto devuelve cada regalo, **según lo que cuesta**.
 *
 * Un regalo caro no puede devolver lo mismo que uno barato. La rosa se manda de
 * cien en cien y lo que devuelve se vuelve a gastar en rosas; el castillo son
 * 9.999 monedas de golpe, así que con el mismo retorno cada acierto suelta una
 * montaña de monedas y el anfitrión acaba recibiendo menos de lo que se gastó
 * en llegar hasta él. Probado el 2026-09-08: el castillo devolvía más de lo
 * invertido y la sesión salía en pérdida.
 *
 * Así que el retorno baja con el precio. El barato mantiene la sensación de que
 * casi siempre vuelve algo, que es lo que hace que se sigan mandando; el caro se
 * paga de verdad, que es de donde sale el dinero.
 *
 *   hasta 100 → 0,85     hasta 999 → 0,78     hasta 1.999 → 0,70
 *   hasta 4.999 → 0,65   por encima → 0,58
 *
 * El techo de los baratos lo pone el nivel 1 del salario, no el gusto: quien se
 * autoregala para cobrar recarga `meta × (1 − retorno)` y recupera
 * `5% de la meta + salario`, que en el nivel 1 son 17.500 fijos. Eso deja el
 * retorno por debajo de 0,883, y la prueba «llegar a la meta con dinero propio
 * nunca compensa» lo vigila.
 *
 * La suerte personal (`lib/lucky-mood`) mueve la probabilidad real entre el 0,7
 * y el 1,67 de la que salga aquí, pero se reparte alrededor de 1, así que estas
 * cifras siguen siendo las del conjunto.
 */
const RETORNO_POR_PRECIO = [
  { hasta: 100, retorno: 0.85 },
  { hasta: 999, retorno: 0.78 },
  { hasta: 1_999, retorno: 0.7 },
  { hasta: 4_999, retorno: 0.65 },
  { hasta: Infinity, retorno: 0.58 },
];

/**
 * Probabilidad de premio por unidad para un precio dado.
 *
 * Sale de despejar el retorno: `retorno = probabilidad × media de los
 * multiplicadores`. Se declara el retorno, que es lo que se decide, y la
 * probabilidad se calcula sola; así cambiar la escalera de premios no obliga a
 * recalcular a mano ninguna de las cinco cifras.
 */
function probabilidadPara(precio: number): number {
  const media = expectedReturn(1, PREMIOS);
  const tramo = RETORNO_POR_PRECIO.find((item) => precio <= item.hasta) ?? RETORNO_POR_PRECIO.at(-1)!;
  return tramo.retorno / media;
}

export const SIN_ILUSTRACION = new Set(['clap', 'wink', 'star', 'candy']);

export const GIFT_CATALOG = [

  // Cofres. Siempre explotan: `luckyChance` es 1 y los pesos reparten cuál de
  // los escalones sale. El premio no vuelve al que envía, se lo queda quien lo
  // recibe, así que el multiplicador medio puede pasar de 1 sin que eso
  // fabrique monedas: es valor que cambia de manos, no que aparece.
  //
  //   bronce  ×11,12 (11.100)   plata  ×11,17 (55.800)   oro  ×11,19 (111.900)
  //
  // Los escalones de ×10 para arriba salen ahora más de la mitad de las veces:
  // 64% en el bronce y 57% en los otros dos.
  //
  // **Los dos primeros niveles del salario se subvencionan a propósito.**
  //
  // Llenar una meta a base de cofres ingresa `meta / media` y paga
  // `salario + 5% de la meta`. A ×11 eso sale a cuenta del nivel 3 en adelante,
  // pero no en los dos primeros:
  //
  //   nivel 1: ingresa 13.636, paga 17.500  → pierde 3.864
  //   nivel 2: ingresa 27.273, paga 28.000  → pierde 727
  //   nivel 3: ingresa 54.545, paga 48.000  → gana
  //
  // El usuario lo decidió así el 2026-09-09 sabiendo la cuenta: el cofre tenía
  // que sentirse generoso y los primeros niveles son baratos de subvencionar.
  // El efecto secundario es que **un anfitrión que se autorregale cofres para
  // cerrar el nivel 1 gana unos 3.900 diamantes al día**, y eso es farmeable con
  // muchas cuentas. La vigilancia (`audit.service`) es lo que tiene que cazarlo.
  //
  // Para quitar la subvención habría que bajar el salario del nivel 1 a 4.500 y
  // el del 2 a 9.000, o subir sus metas.
  { code: 'chest-bronze', name: 'Cofre de bronce', emoji: '🎁', priceCoins: 1_000, image: 'chest-bronze', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '3:24000,5:33000,10:52000,14:29500,20:19500,100:1350,200:410', minFanLevel: 0 },
  { code: 'chest-silver', name: 'Cofre de plata', emoji: '🎁', priceCoins: 5_000, image: 'chest-silver', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '4:30000,6:40000,10:44000,14:24000,20:16000,30:6500,50:2300,120:280,300:75', minFanLevel: 0 },
  { code: 'chest-gold', name: 'Cofre de oro', emoji: '🎁', priceCoins: 10_000, image: 'chest-gold', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '4:60000,6:80000,10:88000,14:48000,20:32000,30:13000,50:4600,140:480,400:130', minFanLevel: 0 },
  // Los de una y cinco monedas: el regalo que se manda por mandar algo, y el
  // que abre la puerta a los demás. En una sala vacía son los que rompen el
  // hielo, y de ahí sale el resto.
  { code: 'clap', name: 'Aplauso', emoji: '👏', priceCoins: 1, image: null, tier: 'basic', animation: 'float', luckyChance: probabilidadPara(1), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'wink', name: 'Guiño', emoji: '😉', priceCoins: 1, image: null, tier: 'basic', animation: 'float', luckyChance: probabilidadPara(1), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'star', name: 'Estrella', emoji: '⭐', priceCoins: 5, image: null, tier: 'basic', animation: 'float', luckyChance: probabilidadPara(5), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'candy', name: 'Caramelo', emoji: '🍬', priceCoins: 5, image: null, tier: 'basic', animation: 'float', luckyChance: probabilidadPara(5), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, image: 'rose', tier: 'basic', animation: 'float', luckyChance: probabilidadPara(10), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, image: 'heart', tier: 'basic', animation: 'float', luckyChance: probabilidadPara(25), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, image: 'beer', tier: 'basic', animation: 'float', luckyChance: probabilidadPara(50), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, image: 'crown', tier: 'rare', animation: 'burst', luckyChance: probabilidadPara(199), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, image: 'fireworks', tier: 'rare', animation: 'burst', luckyChance: probabilidadPara(499), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,0148 × 48,28 = 0,71
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, image: 'ferrari', tier: 'epic', animation: 'fullscreen', luckyChance: probabilidadPara(1299), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, image: 'yacht', tier: 'epic', animation: 'fullscreen', luckyChance: probabilidadPara(2999), luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, image: 'castle', tier: 'legendary', animation: 'fullscreen', luckyChance: probabilidadPara(9999), luckyMultipliers: PREMIOS, minFanLevel: 0 },

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
