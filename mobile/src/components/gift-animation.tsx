import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { GiftEvent } from '../realtime/events';
import { LuckyCounter } from './lucky-counter';
import { colors, radius, spacing } from '../theme';

/** Lo que se espera sin recibir otro igual antes de retirar el anuncio. */
const HOLD_BIG_MS = 2600;
const HOLD_MS = 1500;

/**
 * Anuncio del regalo en curso, arriba a la izquierda.
 *
 * Cuando llega el mismo regalo del mismo remitente no se apila otro anuncio:
 * el contador sube (×1, ×2, ×3…) y el tiempo de permanencia vuelve a empezar,
 * como el combo de las apps del sector. Antes cada envío entraba en una cola y
 * se reproducía entero, así que con el envío automático quedaban animaciones
 * saliendo mucho después de haber parado.
 *
 * Los regalos `fullscreen` entran más grandes y aguantan más, igual que los
 * caros en esas apps.
 */
export function GiftAnimation({
  event,
  comboQuantity,
  comboKey,
  coinsRewarded,
  wins,
  times,
  onDone,
}: {
  event: GiftEvent;
  /** Unidades acumuladas del combo, que es lo que se muestra. */
  comboQuantity: number;
  /** Sube en cada repetición: reinicia la animación y la espera. */
  comboKey: number;
  /** Monedas ganadas por este destinatario, ya sumadas. */
  coinsRewarded: number;
  /** Cuántas unidades premiaron para este destinatario. */
  wins: number;
  /** Suma de los multiplicadores premiados, el número grande. */
  times: number;
  onDone: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const isBig = event.gift.animation === 'fullscreen';

  // La entrada y la retirada se reinician con cada repetición.
  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.delay(isBig ? HOLD_BIG_MS : HOLD_MS),
      Animated.timing(progress, { toValue: 0, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onDone());
    return () => animation.stop();
  }, [event.gift.code, event.sender.id, comboKey, isBig, onDone, progress]);

  // Un golpe de escala en el número cada vez que sube, para que se note.
  useEffect(() => {
    if (comboKey === 0) return;
    pop.setValue(1);
    const animation = Animated.sequence([
      Animated.timing(pop, { toValue: 1.35, duration: 110, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [comboKey, pop]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-260, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <Animated.View style={[styles.container, { opacity: progress, transform: [{ translateX }, { scale }] }]}>
      {/* El acumulado va encima del anuncio, como en las apps del sector: la
          cifra sustituye a la anterior en vez de apilarse otro aviso. */}
      {times > 0 ? <LuckyCounter times={times} coins={coinsRewarded} /> : null}

      <View style={[styles.badge, isBig && styles.badgeBig]}>
        <Text style={[styles.emoji, isBig && styles.emojiBig]}>{event.gift.emoji}</Text>
        <View style={styles.texts}>
          <Text style={styles.sender} numberOfLines={1}>
            {event.sender.displayName}
          </Text>
          <Text style={styles.gift} numberOfLines={1}>
            {event.gift.name} · para {event.recipient.displayName}
          </Text>
          {/* Cada destinatario tiene su propio sorteo, así que su premio se
              cuenta arriba y no se mezcla con el de al lado. */}
          {wins > 0 ? (
            <Text style={styles.reward} numberOfLines={1}>
              🍀 {wins} {wins === 1 ? 'premio' : 'premios'}
            </Text>
          ) : null}
        </View>
        <Animated.Text style={[styles.quantity, { transform: [{ scale: pop }] }]}>
          ×{comboQuantity}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', gap: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,230,118,0.28)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeBig: { backgroundColor: 'rgba(255,210,74,0.30)', borderColor: colors.accent },
  emoji: { fontSize: 26 },
  emojiBig: { fontSize: 38 },
  texts: { maxWidth: 170 },
  sender: { color: colors.text, fontWeight: '700', fontSize: 13 },
  gift: { color: colors.textMuted, fontWeight: '600', fontSize: 11 },
  reward: { color: colors.coin, fontWeight: '800', fontSize: 11 },
  quantity: { color: colors.accent, fontWeight: '800', fontSize: 20 },
});
