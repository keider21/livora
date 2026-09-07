import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GiftEvent } from '../realtime/events';
import { colors, radius, spacing } from '../theme';

/**
 * Efecto de los regalos exclusivos.
 *
 * Estos no explotan ni devuelven monedas: lo que ofrecen es esto. Un halo que
 * crece desde el centro, rayos que giran detrás, el emoji flotando y el nombre
 * de quien lo envía en dorado. Dura más que la explosión normal porque la
 * gracia es justamente que se note en toda la sala.
 */
const RAYS = 12;
const DURATION = 3200;

export function GiftAura({ event, onDone }: { event: GiftEvent; onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const rays = useMemo(() => Array.from({ length: RAYS }, (_, i) => (i / RAYS) * 360), []);

  useEffect(() => {
    progress.setValue(0);
    spin.setValue(0);

    // El giro es continuo y el resto entra y sale: si el halo girase con la
    // misma curva, se pararía en seco al desvanecerse.
    const rotation = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
    );
    const main = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(DURATION - 1300),
      Animated.timing(progress, { toValue: 0, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);

    rotation.start();
    main.start(({ finished }) => finished && onDone());
    return () => {
      rotation.stop();
      main.stop();
    };
  }, [event.id, onDone, progress, spin]);

  const halo = progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.6] });
  const giro = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.rayLayer, { opacity: progress, transform: [{ rotate: giro }] }]}>
        {rays.map((angle) => (
          <View key={angle} style={[styles.ray, { transform: [{ rotate: `${angle}deg` }] }]} />
        ))}
      </Animated.View>

      <Animated.View style={[styles.halo, { opacity: progress, transform: [{ scale: halo }] }]}>
        <LinearGradient
          colors={['rgba(255,210,74,0.45)', 'rgba(255,210,74,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.center,
          {
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.3, 1.15, 1] }) },
            ],
          },
        ]}
      >
        <Text style={styles.emoji}>{event.gift.emoji}</Text>
        <View style={styles.plate}>
          <Text style={styles.sender} numberOfLines={1}>
            {event.sender.displayName}
          </Text>
          <Text style={styles.gift} numberOfLines={1}>
            envió {event.gift.name}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const HALO = 320;

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  rayLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ray: {
    position: 'absolute',
    width: 2,
    height: HALO,
    backgroundColor: 'rgba(255,210,74,0.20)',
  },
  halo: { position: 'absolute', width: HALO, height: HALO, borderRadius: HALO / 2, overflow: 'hidden' },
  center: { alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 96 },
  plate: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,10,7,0.82)',
    borderWidth: 2,
    borderColor: colors.coin,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sender: { color: colors.coin, fontSize: 18, fontWeight: '900' },
  gift: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
