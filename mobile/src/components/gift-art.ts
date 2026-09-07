import type { ImageSourcePropType } from 'react-native';

/**
 * Ilustraciones de los regalos, empaquetadas con la app.
 *
 * El servidor manda solo un nombre (`gift.image`); el archivo vive aquí. Así el
 * teléfono no descarga nada al recibir un regalo, que es lo que importa cuando
 * hay cien personas en una sala y alguien manda veinte seguidos: la primera vez
 * ya está en el paquete y se dibuja al instante.
 *
 * Añadir un regalo ilustrado es dejar el PNG en `assets/gifts/` y registrarlo
 * aquí; `require` necesita una ruta literal, no se puede construir sola.
 *
 * Cuando haya animaciones de verdad (Rive, `.riv`), el sitio es este mismo: se
 * cambia el valor por el archivo y la escena no se entera.
 */
const GIFT_ART: Record<string, ImageSourcePropType> = {
  'lion-imperial': require('../../assets/gifts/lion-imperial.png'),
};

export function giftArt(image: string | null | undefined): ImageSourcePropType | null {
  return image ? (GIFT_ART[image] ?? null) : null;
}
