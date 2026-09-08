import { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: ANCHO } = Dimensions.get('window');

/** Tope mientras no se sabe cuánto dura el clip. */
const RESPALDO_INICIAL_MS = 15000;
/** Margen sobre la duración real, por si el aviso de fin llega tarde. */
const MARGEN_MS = 1500;

/**
 * Clip de un regalo, reproducido una vez sobre la transmisión.
 *
 * El vídeo es la escena entera: trae su propio movimiento y, si el archivo lo
 * incluye, su propio sonido, así que aquí no se le añade nada. Se reproduce
 * `contain` dentro de un cuadrado en lugar de a pantalla completa, porque los
 * clips no tienen canal alfa y estirarlos taparía la transmisión por completo.
 *
 * Quien decide cuándo termina es el propio clip. El respaldo por tiempo existe
 * por si el aviso de fin no llegara: sin él, un vídeo que fallara al cargar
 * dejaría la escena tapando el directo para siempre. En cuanto se conoce la
 * duración real, ese respaldo se ajusta a ella en vez de esperar el tope.
 */
export function GiftVideo({ source, onDone }: { source: number; onDone: () => void }) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.muted = false;
    instance.play();
  });

  // El temporizador se reprograma cuando se sabe la duración, así que vive en
  // una ref para poder cancelarlo desde cualquier aviso.
  const respaldo = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function terminar() {
      clearTimeout(respaldo.current);
      onDone();
    }

    respaldo.current = setTimeout(terminar, RESPALDO_INICIAL_MS);

    const fin = player.addListener('playToEnd', terminar);
    const estado = player.addListener('statusChange', ({ status, error }) => {
      // Si el clip no carga, la escena se retira en vez de quedarse en negro.
      if (error || status === 'error') {
        terminar();
        return;
      }
      if (status === 'readyToPlay' && player.duration > 0) {
        clearTimeout(respaldo.current);
        respaldo.current = setTimeout(terminar, player.duration * 1000 + MARGEN_MS);
      }
    });

    return () => {
      clearTimeout(respaldo.current);
      fin.remove();
      estado.remove();
    };
  }, [player, onDone]);

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
