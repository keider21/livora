import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: ANCHO } = Dimensions.get('window');

/**
 * Clip de un regalo, reproducido una vez sobre la transmisión.
 *
 * El vídeo es la escena entera: trae su propio movimiento y, si el archivo lo
 * incluye, su propio sonido, así que aquí no se le añade nada. Se reproduce
 * `contain` dentro de un cuadrado en lugar de a pantalla completa, porque los
 * clips no tienen canal alfa y estirarlos taparía la transmisión por completo.
 *
 * `onDone` salta al terminar. Si el clip fallara al cargar, el temporizador de
 * respaldo evita que la escena se quede colgada tapando el directo.
 */
export function GiftVideo({
  source,
  fallbackMs,
  onDone,
}: {
  source: number;
  /** Tiempo máximo antes de retirarlo aunque el vídeo no avise. */
  fallbackMs: number;
  onDone: () => void;
}) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.muted = false;
    instance.play();
  });

  useEffect(() => {
    const suscripcion = player.addListener('playToEnd', onDone);
    const respaldo = setTimeout(onDone, fallbackMs);
    return () => {
      suscripcion.remove();
      clearTimeout(respaldo);
    };
  }, [player, fallbackMs, onDone]);

  return (
    <View style={styles.container} pointerEvents="none">
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  video: { width: ANCHO, height: ANCHO },
});
