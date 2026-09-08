import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { GiftEvent } from '../realtime/events';
import { colors } from '../theme';

/**
 * Explosión del regalo: el emoji sale disparado en varias direcciones desde el
 * centro y se apaga. Cuanto más caro el regalo, más partículas y más lejos
 * llegan, que es lo que hace que un regalo grande se note.
 *
 * Aquí **no se escribe el premio**. Lo llevaba en el centro, y como el anuncio
 * de abajo ya dice el multiplicador y las monedas, la misma cifra salía dos
 * veces en pantalla a la vez. La explosión pone el golpe de efecto; el número lo
 * pone el anuncio, que además se queda quieto y se puede leer.
 */
const PARTICLES: Record<string, number> = { float: 6, burst: 12, fullscreen: 20 };
const DISTANCE: Record<string, number> = { float: 90, burst: 150, fullscreen: 240 };

export function GiftBurst({ event, onDone }: { event: GiftEvent; onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const count = PARTICLES[event.gift.animation] ?? PARTICLES.burst!;
  const distance = DISTANCE[event.gift.animation] ?? DISTANCE.burst!;

  // Los ángulos se reparten en círculo con un desvío fijo por partícula, así la
  // explosión no se ve simétrica pero tampoco cambia en cada fotograma.
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.25;
        return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, delay: (i % 4) * 40 };
      }),
    [count, distance],
  );

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: event.gift.animation === 'fullscreen' ? 1400 : 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && onDone());
    return () => animation.stop();
  }, [event.id, event.gift.animation, onDone, progress]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.particle,
            {
              opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.9, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.6] }) },
              ],
            },
          ]}
        >
          {event.gift.emoji}
        </Animated.Text>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', fontSize: 30 },
});
