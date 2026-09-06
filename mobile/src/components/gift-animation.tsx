import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { GiftEvent } from '../realtime/events';
import { colors, radius, spacing } from '../theme';

/**
 * Anuncio animado del último regalo recibido. Los regalos `fullscreen` entran
 * más grandes y duran más, igual que los caros en las apps de streaming.
 */
export function GiftAnimation({ event, onDone }: { event: GiftEvent; onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const isBig = event.gift.animation === 'fullscreen';

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.delay(isBig ? 2600 : 1500),
      Animated.timing(progress, { toValue: 0, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onDone());
    return () => animation.stop();
  }, [event.id, isBig, onDone, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-260, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <Animated.View style={[styles.container, { opacity: progress, transform: [{ translateX }, { scale }] }]}>
      <View style={[styles.badge, isBig && styles.badgeBig]}>
        <Text style={[styles.emoji, isBig && styles.emojiBig]}>{event.gift.emoji}</Text>
        <View style={styles.texts}>
          <Text style={styles.sender} numberOfLines={1}>
            {event.sender.displayName}
          </Text>
          <Text style={styles.gift} numberOfLines={1}>
            envió {event.gift.name}
          </Text>
        </View>
        <Text style={styles.quantity}>×{event.quantity}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start' },
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
  quantity: { color: colors.accent, fontWeight: '800', fontSize: 18 },
});
