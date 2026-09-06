import { Image } from 'react-native';

/**
 * Marca de Livora Stream: la letra A sobre el degradado de marca.
 *
 * Reutiliza el mismo archivo que el icono de la tienda (generado por
 * `scripts/generate-icons.py`), así el logo dentro de la app y el del
 * lanzador nunca se separan.
 */
export function LogoMark({ size = 76 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/logo-mark.png')}
      style={{ width: size, height: size, borderRadius: size * 0.225 }}
      accessibilityLabel="Livora Stream"
    />
  );
}
