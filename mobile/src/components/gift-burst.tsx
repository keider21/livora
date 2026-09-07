import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { GiftEvent } from '../realtime/events';
import { colors, radius, spacing } from '../theme';

/**
 * Explosión del regalo: el emoji sale disparado en varias direcciones desde el
 * centro y se apaga. Cuanto más caro el regalo, más partículas y más lejos
 * llegan, que es lo que hace que un regalo grande se note.
 */
const PARTICLES: Record<string, number> = { float: 6, burst: 12, fullscreen: 20 };
const DISTANCE: Record<string, number> = { float: 90, burst: 150, fullscreen: 240 };

export function GiftBurst({
  event,
  coinsRewarded,
  wins,
  onDone,
}: {
  event: GiftEvent;
  /** Monedas ganadas en todo el combo, no solo en el último envío. */
  coinsRewarded: number;
  /** Cuántas unidades premiaron en total. */
  wins: number;
  onDone: () => void;
}) {
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

      {/* Si tocó premio, el aviso sale en el centro de la explosión. Con un
          paquete grande no se enseña ×2 tres veces: se dice cuántas unidades
          premiaron y el total de monedas ganadas, ya sumado. */}
      {coinsRewarded > 0 ? (
        <Animated.View
          style={[
            styles.reward,
            {
              opacity: progress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.15, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.rewardMultiplier}>
            {wins > 1 ? `×${wins}` : `×${event.luckyMultiplier}`}
          </Text>
          <Text style={styles.rewardCoins}>
            {wins > 1 ? `${wins} premios · ` : ''}+{coinsRewarded.toLocaleString('es')} monedas
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', fontSize: 30 },
  reward: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,10,7,0.82)',
    borderWidth: 2,
    borderColor: colors.coin,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rewardMultiplier: { color: colors.coin, fontSize: 34, fontWeight: '900' },
  rewardCoins: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
