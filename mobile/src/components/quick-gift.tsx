import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Gift } from '../api/types';
import { colors, radius, spacing } from '../theme';

/** Cuánto dura la ventana para repetir el envío sin volver a abrir la caja. */
const WINDOW_MS = 5000;
/** Cadencia del envío automático mientras esté activado. */
const AUTO_MS = 500;

/**
 * Botón flotante para repetir el último regalo.
 *
 * Aparece al enviar con el candado echado y se queda cinco segundos, con un
 * aro que se va vaciando. Cada toque reinicia la cuenta, así que se puede
 * encadenar sin abrir la caja. Encima lleva el interruptor de envío automático,
 * que dispara solo cada medio segundo hasta que se apaga o se acaba el tiempo.
 */
export function QuickGift({
  gift,
  quantity,
  onSend,
  onExpire,
}: {
  gift: Gift;
  quantity: number;
  onSend: () => void;
  onExpire: () => void;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const [auto, setAuto] = useState(false);
  // El envío se lee desde los temporizadores, que no ven los valores nuevos de
  // cada render: la ref siempre apunta al último.
  const sendRef = useRef(onSend);
  useEffect(() => {
    sendRef.current = onSend;
  }, [onSend]);

  const [ronda, setRonda] = useState(0);

  // La cuenta atrás se reinicia en cada envío: `ronda` cambia y el efecto
  // vuelve a empezar.
  useEffect(() => {
    progress.setValue(1);
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: WINDOW_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => finished && onExpire());
    return () => animation.stop();
  }, [ronda, onExpire, progress]);

  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => {
      sendRef.current();
      setRonda((current) => current + 1);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [auto]);

  const anguloVisible = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setAuto((current) => !current)}
        style={[styles.autoPill, auto && styles.autoOn]}
        accessibilityLabel={auto ? 'Parar el envío automático' : 'Enviar automáticamente'}
      >
        <Ionicons name={auto ? 'pause' : 'flash'} size={12} color={auto ? colors.onPrimary : colors.coin} />
        <Text style={[styles.autoText, auto && styles.autoTextOn]}>Auto</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          sendRef.current();
          setRonda((current) => current + 1);
        }}
        style={styles.button}
        accessibilityLabel={`Enviar otra vez ${gift.name}`}
      >
        {/* El aro es una barra que se vacía por debajo del emoji: dibujar un
            arco real necesitaría SVG, y esto se lee igual de bien. */}
        <View style={styles.ring}>
          <Animated.View style={[styles.ringFill, { height: anguloVisible }]} />
        </View>
        <Text style={styles.emoji}>{gift.emoji}</Text>
        <Text style={styles.quantity}>×{quantity}</Text>
      </Pressable>
    </View>
  );
}

const SIZE = 58;

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs },
  autoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(5,10,7,0.75)',
    borderWidth: 1,
    borderColor: colors.coin,
  },
  autoOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  autoText: { color: colors.coin, fontSize: 10, fontWeight: '800' },
  autoTextOn: { color: colors.onPrimary },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,10,7,0.75)',
    borderWidth: 2,
    borderColor: colors.coin,
    overflow: 'hidden',
  },
  ring: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  ringFill: { backgroundColor: 'rgba(255,210,74,0.28)' },
  emoji: { fontSize: 24 },
  quantity: { color: colors.coin, fontSize: 10, fontWeight: '800' },
});
