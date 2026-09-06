import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../theme';
import type { StreamSurfaceProps } from './provider';

/**
 * Superficie de vídeo simulada.
 *
 * Ocupa el mismo hueco que ocuparía la vista nativa de Agora o LiveKit y anima
 * un degradado para que la sala se vea viva durante el desarrollo. Al enchufar
 * el proveedor real solo se sustituye este componente.
 */
export function MockStreamSurface({ credentials, hostName, muted, children }: StreamSurfaceProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B3A28', '#082018', '#050A07']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.glow, { transform: [{ scale }], opacity }]}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.glowInner} />
      </Animated.View>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.initial}>{hostName.charAt(0).toUpperCase()}</Text>
        <Text style={styles.host}>{hostName}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            vídeo simulado · {credentials.role === 'host' ? 'emitiendo' : 'viendo'}
            {muted ? ' · silenciado' : ''}
          </Text>
        </View>
        <Text style={styles.channel}>canal {credentials.channel.slice(0, 22)}</Text>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  glow: { position: 'absolute', top: '22%', alignSelf: 'center', width: 320, height: 320 },
  glowInner: { flex: 1, borderRadius: 160, opacity: 0.55 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  initial: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 12,
  },
  host: { fontSize: 20, fontWeight: '700', color: colors.text },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  badgeText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  channel: { color: colors.textFaint, fontSize: 11 },
});
