import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import type { GiftEvent } from '../realtime/events';
import { paletaEnvio, proteccionPremio } from './lucky-counter';
import { giftArt } from './gift-art';
import { PLACA, PROPORCION_BANDA, bandaDePremio, tintaDePremio } from './win-banner';
import { Avatar } from './ui';
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

  // Con premio, el anuncio se convierte en la banda: marco dorado siempre y la
  // placa de dentro del color del tamaño del premio. Sin premio se queda la
  // pastilla de siempre, que ocupa poco y no compite con el vídeo.
  if (times > 0) {
    const tinta = tintaDePremio(times);
    return (
      <Animated.View style={[styles.container, { opacity: progress, transform: [{ translateX }, { scale }] }]}>
        <View style={styles.bandaFila}>
          <View style={styles.banda}>
            {/* La lámina es un marco. Su altura sale de la proporción, y lo que
                va encima se recorta a la placa para que nada pise las cintas. */}
            <Image source={bandaDePremio(times)} style={StyleSheet.absoluteFill} contentFit="fill" />

            <View style={styles.placa}>
              <View style={styles.placaFila}>
                {giftArt(event.gift.image) ? (
                  <Image source={giftArt(event.gift.image)!} style={styles.bandaArte} contentFit="contain" />
                ) : (
                  <Text style={styles.bandaEmoji}>{event.gift.emoji}</Text>
                )}
                <Text style={styles.bandaNombres} numberOfLines={1}>
                  {event.sender.displayName} › {event.recipient.displayName}
                </Text>
              </View>

              {/* El multiplicador toma el color de la placa: la pastilla morada
                  del contador normal chocaba con el marco dorado. */}
              <View style={styles.placaPremio}>
                <Text style={[styles.bandaMultiplicador, { color: tinta }]} numberOfLines={1}>
                  ×{times.toLocaleString('es')}
                </Text>
                <Text style={styles.bandaMonedas} numberOfLines={1}>
                  🪙 {coinsRewarded.toLocaleString('es')}
                </Text>
              </View>
            </View>
          </View>

          {/* Cuántos van enviados, fuera del marco y a la derecha, como en las
              apps del sector: dentro competía con el premio y encima no cabía. */}
          <Animated.Text style={[styles.bandaCombo, { transform: [{ scale: pop }] }]}>
            ×{comboQuantity}
          </Animated.Text>
        </View>
      </Animated.View>
    );
  }

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
        {giftArt(event.gift.image) ? (
          <Image
            source={giftArt(event.gift.image)!}
            style={[styles.arte, isBig && styles.arteBig]}
            contentFit="contain"
          />
        ) : (
          <Text style={[styles.emoji, isBig && styles.emojiBig]}>{event.gift.emoji}</Text>
        )}

        <View style={styles.texts}>
          <Text style={styles.sender} numberOfLines={1}>
            {event.sender.displayName}
          </Text>
          {/* La cara de quien lo recibe, no solo el nombre: al regalar a varios
              salen varias tarjetas a la vez y con la foto se distingue de un
              vistazo cuál es cuál y a quién le tocó el premio. */}
          <View style={styles.destino}>
            <Text style={styles.gift} numberOfLines={1}>
              {event.gift.name} ·
            </Text>
            <Avatar uri={event.recipient.avatarUrl} name={event.recipient.displayName} size={14} />
            <Text style={styles.gift} numberOfLines={1}>
              {event.recipient.displayName}
            </Text>
          </View>
        </View>

        <Animated.Text style={[styles.quantity, { transform: [{ scale: pop }] }]}>
          ×{comboQuantity}
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

/**
 * Tamaños pensados para que la tarjeta ocupe poco: va sobre el vídeo y la gente
 * ha venido a ver la transmisión, no los anuncios. Con tres a la vez apiladas,
 * cualquier cosa más grande se come media pantalla.
 */
/** Ancho de la banda de premio. La altura sale de la proporción de la lámina. */
const ANCHO_BANDA = 236;

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start' },

  bandaFila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  banda: { width: ANCHO_BANDA, height: Math.round(ANCHO_BANDA / PROPORCION_BANDA) },
  // La placa es el hueco liso de la lámina; fuera de él se lo comen las cintas.
  // Va recortada para que ningún nombre largo se salga del marco.
  placa: {
    position: 'absolute',
    left: `${PLACA.izquierda * 100}%`,
    right: `${PLACA.derecha * 100}%`,
    top: `${PLACA.arriba * 100}%`,
    bottom: `${PLACA.abajo * 100}%`,
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 1,
  },
  placaFila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  placaPremio: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bandaArte: { width: 15, height: 15 },
  bandaEmoji: { fontSize: 13 },
  bandaNombres: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 8.5,
    lineHeight: 11,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bandaMultiplicador: {
    fontWeight: '900',
    fontSize: 15,
    // Sobre la placa iluminada, el número necesita sombra para separarse.
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bandaMonedas: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bandaCombo: {
    color: colors.coin,
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeBig: { borderColor: colors.accent },
  emoji: { fontSize: 15 },
  emojiBig: { fontSize: 20 },
  arte: { width: 22, height: 22 },
  arteBig: { width: 28, height: 28 },
  destino: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  texts: { maxWidth: 150 },
  // Blanco puro sobre los fondos saturados, que ya son oscuros de por sí.
  sender: { color: '#FFFFFF', fontWeight: '800', fontSize: 9 },
  gift: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 8 },
  quantity: { color: colors.accent, fontWeight: '800', fontSize: 13 },
});
