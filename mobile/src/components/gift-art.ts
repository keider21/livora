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
};

export function giftAsset(image: string | null | undefined): GiftAsset | null {
  return image ? (GIFT_ASSETS[image] ?? null) : null;
}

/** Solo la imagen fija, para las listas. */
export function giftArt(image: string | null | undefined): ImageSourcePropType | null {
  return giftAsset(image)?.image ?? null;
}
