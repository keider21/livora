import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Gift } from '../api/types';
import { colors, radius, spacing } from '../theme';

/** Cuánto dura la ventana para repetir el envío sin volver a abrir la caja. */
const WINDOW_MS = 5000;
/**
 * Pausa entre envíos automáticos, contada **después** de que termine el
 * anterior. Fue bajando de 500 a 150, a 60 y ahora a 30. De aquí para abajo ya no
 * cambia nada: lo que marca el ritmo es el viaje de ida y vuelta de cada envío
 * al servidor, que son decenas de milisegundos y no se pueden recortar desde
 * este lado.
 */
const AUTO_MS = 30;

/**
 * Botón flotante para repetir el último regalo.
 *
 * Aparece al enviar y se queda cinco segundos, con una barra que se vacía.
 * Cada toque reinicia la cuenta, así que se puede encadenar sin abrir la caja.
 * Encima lleva el interruptor de envío automático.
 *
 * El automático encadena los envíos **de uno en uno**: espera a que el anterior
 * termine antes de programar el siguiente. Con un `setInterval` fijo, un envío
 * más lento que el intervalo dejaba varios en vuelo a la vez y seguían
 * llegando después de apagar el interruptor, que es lo que parecía que se
 * quedaba pegado. Si un envío falla (por ejemplo, sin monedas), el automático
 * se apaga solo en vez de insistir.
 */
export function QuickGift({
  gift,
  quantity,
  onSend,
  onExpire,
}: {
  gift: Gift;
  quantity: number;
  /** Devuelve si el envío salió bien; en caso contrario el automático se para. */
  onSend: () => Promise<boolean>;
  onExpire: () => void;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const [auto, setAuto] = useState(false);
  const [ronda, setRonda] = useState(0);

  // Los envíos se disparan desde temporizadores, que no ven los valores nuevos
  // de cada render: las refs siempre apuntan a lo último.
  const sendRef = useRef(onSend);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    sendRef.current = onSend;
    expireRef.current = onExpire;
  }, [onSend, onExpire]);

  // La cuenta atrás se reinicia en cada envío: `ronda` cambia y vuelve a
  // empezar. No depende de las funciones del padre, que cambian de identidad en
  // cada render y reiniciarían la animación sin parar.
  useEffect(() => {
    progress.setValue(1);
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: WINDOW_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => finished && expireRef.current());
    return () => animation.stop();
  }, [ronda, progress]);

  useEffect(() => {
    if (!auto) return;

    // Bandera de cancelación: al apagar el interruptor o desmontar, el ciclo en
    // curso termina sin programar el siguiente.
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function ciclo() {
      if (cancelado) return;
      const ok = await sendRef.current();
      if (cancelado) return;
      if (!ok) {
        setAuto(false);
        return;
      }
      setRonda((current) => current + 1);
      timer = setTimeout(ciclo, AUTO_MS);
    }

    void ciclo();

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
    };
  }, [auto]);

  const enviarUno = useCallback(() => {
    void sendRef.current();
    setRonda((current) => current + 1);
  }, []);

  const restante = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setAuto((current) => !current)}
        style={[styles.autoPill, auto && styles.autoOn]}
        accessibilityLabel={auto ? 'Parar el envío automático' : 'Enviar automáticamente'}
      >
        <Ionicons name={auto ? 'stop' : 'flash'} size={12} color={auto ? colors.onPrimary : colors.coin} />
        <Text style={[styles.autoText, auto && styles.autoTextOn]}>{auto ? 'Parar' : 'Auto'}</Text>
      </Pressable>

      <Pressable onPress={enviarUno} style={styles.button} accessibilityLabel={`Enviar otra vez ${gift.name}`}>
        {/* La cuenta atrás se dibuja como un relleno que baja por detrás del
            emoji: un arco real necesitaría SVG y se lee igual de bien. */}
        <View style={styles.ring}>
          <Animated.View style={[styles.ringFill, { height: restante }]} />
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
  autoOn: { backgroundColor: colors.live, borderColor: colors.live },
  autoText: { color: colors.coin, fontSize: 10, fontWeight: '800' },
  autoTextOn: { color: '#FFFFFF' },
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
