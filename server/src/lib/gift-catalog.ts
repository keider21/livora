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
 *   ×10 → 1,467%   ×20 → 0,124%   ×50 → 0,099%   ×500 → 0,131%
 *
 * Los pesos son esas cifras en proporción; la suma va aparte en `PROBABILIDAD`.
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
 * Probabilidad de premio por unidad: la suma de los cuatro escalones.
 *
 * Con la media de multiplicadores en 48,18, el retorno sale `probabilidad ×
 * 48,18`. Aquí queda en 1,82%: retorno 0,88.
 *
 * ## Historial del ajuste (2026-09-08)
 *
 * Con retorno 0,84 y el 5% que vuelve en diamantes, quien se regalaba a sí mismo
 * recuperaba 0,89 de cada moneda y podía seguir jugando casi sin gastar:
 * repetido hasta agotar el saldo, el **45% de una recarga acababa en diamantes
 * propios**, que son retirables. Bajó a 0,70, luego a 0,50 recortando el ×500 a
 * la mitad, y volvió a 0,70 al ver que sin gordos la mecánica se apagaba: el
 * ×500 quedó en 0,104% y la probabilidad base subió, así que se ven más premios
 * pequeños **y** los gordos siguen apareciendo.
 *
 * ## Por qué se para en 0,88
 *
 * Lo que decide el retorno no es solo cuánto se recupera: es **cuánto se puede
 * mover hacia la meta del anfitrión con una recarga**, porque lo devuelto se
 * vuelve a gastar. Con una recarga de 10.000 monedas el volumen total es
 * `10.000 / (1 − retorno)`:
 *
 *   0,70 → 33.000     0,85 → 66.000     0,88 → 81.000     0,90 → 100.000
 *
 * A 0,70 un dólar no llegaba ni a la mitad de la primera meta y el sistema de
 * metas no se podía ni probar. A 0,88 llega al 54%.
 *
 * **Y ahí se para, por el nivel 1 del salario.** Un anfitrión que se autoregale
 * para cobrar tiene que recargar `meta × (1 − retorno)` y recupera
 * `5% de la meta + salario`. Con una meta de 150.000 y 10.000 de salario,
 * recupera 17.500 pase lo que pase, así que la recarga tiene que costarle más
 * que eso: `150.000 × (1 − retorno) > 17.500` deja el retorno por debajo de
 * 0,883. A 0,90 el nivel 1 se convierte en una bomba de dinero: recargar 1,48
 * dólares devuelve 1,75 en diamantes retirables. La prueba «llegar a la meta con
 * dinero propio nunca compensa» lo comprobó antes de que llegara a la APK.
 *
 * Para pasar de ahí hay que tocar el nivel 1: con 6.000 de salario en vez de
 * 10.000, el retorno podría llegar a 0,90.
 *
 * El precio está en el otro lado: la plataforma paga el 5% de ese volumen en
 * diamantes, o sea el 41% de la recarga. Y quien se regala a sí mismo convierte
 * ese mismo 41% en diamantes propios, que son retirables.
 *
 * Hay un segundo efecto, más difícil de ver: en racha caliente el factor de
 * suerte llega a 2,2, así que el retorno momentáneo pasa de 1,98. Ahí las
 * monedas se multiplican de verdad mientras dura. La racha no se puede
 * cronometrar —cada cuenta lleva la suya y no se enseña—, pero quien note que
 * está premiando y vacíe el saldo en ese rato saca ventaja. Es el precio de un
 * retorno tan alto.
 *
 * La suerte personal (`lib/lucky-mood`) mueve la probabilidad real entre el
 * 0,73% y el 2,90% según el momento de cada cuenta, pero se reparte alrededor
 * de 1, así que esta cifra sigue siendo la del conjunto.
 */
const PROBABILIDAD = 0.0182;

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
  //   bronce  ×8,23 (8.200)    plata  ×8,28 (41.400)    oro  ×8,28 (82.800)
  //
  // Los escalones de ×10 para arriba salen ahora un 35-43% de las veces, así que
  // en diez cofres cae alguno prácticamente siempre.
  //
  // **La media no puede subir mucho más.** El cofre es la vía barata de llenar
  // la meta, y el techo lo marca el nivel 1 del salario: paga 10.000 diamantes
  // por una meta de 150.000, o sea el 6,67%, y con el 5% de diamantes de los
  // regalos son 11,67% de la meta pagados. Llenarla a base de cofres ingresa
  // `meta / media`, así que por encima de ×8,57 se paga más de lo que entra. Los
  // niveles altos aguantan hasta ×14-16; manda el más estrecho. **Aquí ya no
  // caben más subidas**: para pasar de ×8,57 habría que bajar el salario del
  // nivel 1 o subir su meta. La prueba «los
  // cofres siempre premian» calcula ese tope desde la tabla de salarios, así que
  // se mueve solo si la tabla cambia.
  { code: 'chest-bronze', name: 'Cofre de bronce', emoji: '🎁', priceCoins: 1_000, image: 'chest-bronze', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '3:52000,5:48000,10:44000,14:19000,20:12000,100:650,200:200', minFanLevel: 0 },
  { code: 'chest-silver', name: 'Cofre de plata', emoji: '🎁', priceCoins: 5_000, image: 'chest-silver', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '4:66000,6:52000,10:36000,14:15000,20:9000,30:3400,50:1150,120:140,300:35', minFanLevel: 0 },
  { code: 'chest-gold', name: 'Cofre de oro', emoji: '🎁', priceCoins: 10_000, image: 'chest-gold', tier: GIFT_TIER_CHEST, animation: 'chest', luckyChance: 1, luckyMultipliers: '4:132000,6:104000,10:72000,14:30000,20:18000,30:6800,50:2300,140:230,400:60', minFanLevel: 0 },
  // Los de una y cinco monedas: el regalo que se manda por mandar algo, y el
  // que abre la puerta a los demás. En una sala vacía son los que rompen el
  // hielo, y de ahí sale el resto.
  { code: 'clap', name: 'Aplauso', emoji: '👏', priceCoins: 1, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'wink', name: 'Guiño', emoji: '😉', priceCoins: 1, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'star', name: 'Estrella', emoji: '⭐', priceCoins: 5, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'candy', name: 'Caramelo', emoji: '🍬', priceCoins: 5, image: null, tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,0182 × 48,18 = 0,88
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, image: 'rose', tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, image: 'heart', tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, image: 'beer', tier: 'basic', animation: 'float', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, image: 'crown', tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, image: 'fireworks', tier: 'rare', animation: 'burst', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  // 0,0148 × 48,28 = 0,71
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, image: 'ferrari', tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, image: 'yacht', tier: 'epic', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, image: 'castle', tier: 'legendary', animation: 'fullscreen', luckyChance: PROBABILIDAD, luckyMultipliers: PREMIOS, minFanLevel: 0 },

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
