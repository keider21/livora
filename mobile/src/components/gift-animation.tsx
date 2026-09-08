import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GiftEvent } from '../realtime/events';
import { LuckyCounter, paletaEnvio, proteccionPremio } from './lucky-counter';
import { colors, radius, spacing } from '../theme';

/** Lo que se espera sin recibir otro igual antes de retirar el anuncio. */
const HOLD_BIG_MS = 2600;
const HOLD_MS = 1500;

/**
 * Anuncio del regalo en curso, arriba a la izquierda.
 *
 * **La tarjeta entra una sola vez y se queda quieta**: lo único que se mueve
 * después son los números, que suben, y la marca del premio, que cambia cuando
 * toca. Antes la entrada se relanzaba con cada envío, así que con el automático
 * la tarjeta parecía reiniciarse sin parar y el texto se veía superpuesto.
 *
 * Lo que sí se reprograma en cada envío es la retirada: mientras siga llegando
 * el mismo regalo, la tarjeta no se va.
 *
 * Los regalos `fullscreen` entran más grandes y aguantan más, igual que los
 * caros en las apps del sector.
 */
export function GiftAnimation({
  event,
  comboQuantity,
  comboKey,
  coinsRewarded,
  times,
  luckyRound,
  onDone,
}: {
  event: GiftEvent;
  /** Unidades acumuladas del combo, que es lo que se muestra. */
  comboQuantity: number;
  /** Sube en cada repetición: aplaza la retirada y da un golpe al número. */
  comboKey: number;
  /** Monedas ganadas por este destinatario, ya sumadas. */
  coinsRewarded: number;
  /**
   * Suma de los multiplicadores del último envío que premió, que es la cifra
   * que se enseña. 0 mientras no haya tocado ninguno.
   */
  times: number;
  /** Sube con cada premio nuevo; relanza la animación de la marca. */
  luckyRound: number;
  onDone: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const isBig = event.gift.animation === 'fullscreen';

  // El aviso de fin se guarda en una ref: el padre lo redefine en cada render y,
  // si estuviera en las dependencias, la retirada se reprogramaría sin parar y
  // la tarjeta no se iría nunca.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Entrada: una sola vez, al aparecer.
  useEffect(() => {
    const entrada = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    entrada.start();
    return () => entrada.stop();
  }, [progress]);

  // Retirada: se aplaza con cada envío nuevo. Un premio gordo alarga la espera,
  // porque si no desaparece antes de que dé tiempo a leerlo.
  useEffect(() => {
    const espera = Math.max(isBig ? HOLD_BIG_MS : HOLD_MS, proteccionPremio(times));
    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => finished && onDoneRef.current());
    }, espera);

    return () => clearTimeout(timer);
  }, [comboKey, isBig, times, progress]);

  // Un golpe de escala en el número cada vez que sube, para que se note. Es lo
  // único que se mueve de la tarjeta mientras siguen llegando envíos.
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
      {/* El fondo sube de tono con los regalos que lleva enviados la racha, no
          con el premio: así quien manda mucho se distingue de lejos y el color
          no va y viene con cada acierto. */}
      <LinearGradient
        colors={paletaEnvio(comboQuantity)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, isBig && styles.badgeBig]}
      >
        <Text style={[styles.emoji, isBig && styles.emojiBig]}>{event.gift.emoji}</Text>

        <View style={styles.texts}>
          <Text style={styles.sender} numberOfLines={1}>
            {event.sender.displayName}
          </Text>
          <Text style={styles.gift} numberOfLines={1}>
            {event.gift.name} · para {event.recipient.displayName}
          </Text>

          {/* La marca del premio va aquí dentro, bajo el nombre. Cada
              destinatario tiene su propio sorteo, así que esta es la suya. */}
          {times > 0 ? (
            <View style={styles.premio}>
              <LuckyCounter multiplier={times} round={luckyRound} />
              <Text style={styles.monedas} numberOfLines={1}>
                +{coinsRewarded.toLocaleString('es')}
              </Text>
            </View>
          ) : null}
        </View>

        <Animated.Text style={[styles.quantity, { transform: [{ scale: pop }] }]}>
          ×{comboQuantity}
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', gap: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeBig: { borderColor: colors.accent },
  emoji: { fontSize: 26 },
  emojiBig: { fontSize: 38 },
  texts: { maxWidth: 190, gap: 1 },
  premio: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 1 },
  monedas: { color: colors.coin, fontSize: 11, fontWeight: '800' },
  // Blanco puro sobre los fondos saturados, que ya son oscuros de por sí.
  sender: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  gift: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 11 },
  quantity: { color: colors.accent, fontWeight: '800', fontSize: 20 },
});
