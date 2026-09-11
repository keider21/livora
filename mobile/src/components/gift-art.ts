import type { ImageSourcePropType } from 'react-native';

/**
 * Recursos de los regalos, empaquetados con la app.
 *
 * El servidor manda solo un nombre (`gift.image`); los archivos viven aquí. Así
 * el teléfono no descarga nada al recibir un regalo, que es lo que importa
 * cuando hay cien personas en una sala y alguien manda veinte seguidos: ya está
 * en el paquete y se reproduce al instante.
 *
 * Un regalo puede traer una ilustración fija, un vídeo, o las dos: la
 * ilustración se usa en la tarjeta del selector, donde un vídeo sería absurdo, y
 * el vídeo manda en la escena a pantalla completa.
 *
 * Añadir un regalo es dejar los archivos en `assets/gifts/` y registrarlos aquí;
 * `require` necesita una ruta literal, no se puede construir sola.
 *
 * **Sobre el peso:** cada vídeo suma su tamaño entero a la APK. El del León son
 * 19 MB. Con unos pocos más habrá que servirlos desde un CDN y cachearlos en el
 * teléfono en vez de empaquetarlos.
 */
export interface GiftAsset {
  /** Imagen fija: tarjeta del selector y respaldo si no hay vídeo. */
  image?: ImageSourcePropType;
  /** Clip que se reproduce en la escena. Puede traer su propio audio. */
  video?: number;
}

const GIFT_ASSETS: Record<string, GiftAsset> = {
  'lion-imperial': {
    image: require('../../assets/gifts/lion-imperial.png'),
    video: require('../../assets/gifts/lion-imperial.mp4'),
  },
  rose: { image: require('../../assets/gifts/rose.png') },
  heart: { image: require('../../assets/gifts/heart.png') },
  beer: { image: require('../../assets/gifts/beer.png') },
  crown: { image: require('../../assets/gifts/crown.png') },
  fireworks: { image: require('../../assets/gifts/fireworks.png') },
  ferrari: { image: require('../../assets/gifts/ferrari.png') },
  yacht: { image: require('../../assets/gifts/yacht.png') },
  castle: { image: require('../../assets/gifts/castle.png') },
  // Los cofres se pintan en la misma rejilla que los regalos, así que su arte
  // vive aquí también aunque su catálogo sea otro.
  'chest-bronze': { image: require('../../assets/gifts/chest-bronze.png') },
  'chest-silver': { image: require('../../assets/gifts/chest-silver.png') },
  'chest-gold': { image: require('../../assets/gifts/chest-gold.png') },
  phoenix: { image: require('../../assets/gifts/phoenix.png') },
  galaxy: { image: require('../../assets/gifts/galaxy.png') },
  dragon: { image: require('../../assets/gifts/dragon.png') },
  'sea-king': { image: require('../../assets/gifts/sea-king.png') },
  'celestial-tower': { image: require('../../assets/gifts/celestial-tower.png') },
  tesla: { image: require('../../assets/gifts/tesla.png') },
  universe: { image: require('../../assets/gifts/universe.png') },
  'golden-city': { image: require('../../assets/gifts/golden-city.png') },
  phenomenon: { image: require('../../assets/gifts/phenomenon.png') },

  // Los sesenta de la pestaña Suerte y los dos del club que ya tienen arte.
  aurora: { image: require('../../assets/gifts/aurora.png') },
  balloon: { image: require('../../assets/gifts/balloon.png') },
  bike: { image: require('../../assets/gifts/bike.png') },
  bouquet: { image: require('../../assets/gifts/bouquet.png') },
  bullettrain: { image: require('../../assets/gifts/bullettrain.png') },
  butterfly: { image: require('../../assets/gifts/butterfly.png') },
  cake: { image: require('../../assets/gifts/cake.png') },
  camera: { image: require('../../assets/gifts/camera.png') },
  candy: { image: require('../../assets/gifts/candy.png') },
  carousel: { image: require('../../assets/gifts/carousel.png') },
  champagne: { image: require('../../assets/gifts/champagne.png') },
  clap: { image: require('../../assets/gifts/clap.png') },
  clover: { image: require('../../assets/gifts/clover.png') },
  cocktail: { image: require('../../assets/gifts/cocktail.png') },
  coffee: { image: require('../../assets/gifts/coffee.png') },
  cupcake: { image: require('../../assets/gifts/cupcake.png') },
  diamond: { image: require('../../assets/gifts/diamond.png') },
  donut: { image: require('../../assets/gifts/donut.png') },
  'fan-bracelet': { image: require('../../assets/gifts/fan-bracelet.png') },
  'fan-jacket': { image: require('../../assets/gifts/fan-jacket.png') },
  guitar: { image: require('../../assets/gifts/guitar.png') },
  helicopter: { image: require('../../assets/gifts/helicopter.png') },
  icecream: { image: require('../../assets/gifts/icecream.png') },
  island: { image: require('../../assets/gifts/island.png') },
  kiss: { image: require('../../assets/gifts/kiss.png') },
  limo: { image: require('../../assets/gifts/limo.png') },
  mansion: { image: require('../../assets/gifts/mansion.png') },
  mic: { image: require('../../assets/gifts/mic.png') },
  motorbike: { image: require('../../assets/gifts/motorbike.png') },
  perfume: { image: require('../../assets/gifts/perfume.png') },
  pharaoh: { image: require('../../assets/gifts/pharaoh.png') },
  piano: { image: require('../../assets/gifts/piano.png') },
  pizza: { image: require('../../assets/gifts/pizza.png') },
  plane: { image: require('../../assets/gifts/plane.png') },
  popcorn: { image: require('../../assets/gifts/popcorn.png') },
  ribbon: { image: require('../../assets/gifts/ribbon.png') },
  ring: { image: require('../../assets/gifts/ring.png') },
  rocket: { image: require('../../assets/gifts/rocket.png') },
  sax: { image: require('../../assets/gifts/sax.png') },
  smile: { image: require('../../assets/gifts/smile.png') },
  sparkler: { image: require('../../assets/gifts/sparkler.png') },
  speedboat: { image: require('../../assets/gifts/speedboat.png') },
  star: { image: require('../../assets/gifts/star.png') },
  sunflower: { image: require('../../assets/gifts/sunflower.png') },
  teddy: { image: require('../../assets/gifts/teddy.png') },
  telescope: { image: require('../../assets/gifts/telescope.png') },
  thumb: { image: require('../../assets/gifts/thumb.png') },
  tiger: { image: require('../../assets/gifts/tiger.png') },
  trophy: { image: require('../../assets/gifts/trophy.png') },
  vinyl: { image: require('../../assets/gifts/vinyl.png') },
  volcano: { image: require('../../assets/gifts/volcano.png') },
  watch: { image: require('../../assets/gifts/watch.png') },
  wave: { image: require('../../assets/gifts/wave.png') },
  wink: { image: require('../../assets/gifts/wink.png') },
};

export function giftAsset(image: string | null | undefined): GiftAsset | null {
  return image ? (GIFT_ASSETS[image] ?? null) : null;
}

/** Solo la imagen fija, para las listas. */
export function giftArt(image: string | null | undefined): ImageSourcePropType | null {
  return giftAsset(image)?.image ?? null;
}
