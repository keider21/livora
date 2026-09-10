import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { GiftEvent } from '../realtime/events';
import { giftArt } from './gift-art';
import { colors, spacing } from '../theme';


const DESTELLOS = 14;

/**
 * El cofre abriéndose en medio de la sala.
 *
 * Un cofre siempre explota, así que la gracia no está en si toca sino en cuánto:
 * primero tiembla, luego se abre de golpe con un estallido de luz y solo
 * entonces sube la cifra. Ese orden es lo que hace la espera; enseñar el número
 * a la vez que el cofre le quitaría el momento.
 *
 * La cifra sale en grande cuando la tapa ya cedió, y sale **sin recuadro**: un
 * marco con el multiplicador dentro competía con el cofre y parecía una etiqueta
 * pegada encima. Solo el número, con su resplandor y su sombra, subiendo mientras
 * el cofre se apaga detrás.
 *
 * Va el monto, no el multiplicador. «×4» hay que traducirlo mentalmente; «44.000»
 * se entiende de un vistazo, que es todo el tiempo que dura.
 */
export function ChestOpen({ event, onDone }: { event: GiftEvent; onDone: () => void }) {
  const progreso = useRef(new Animated.Value(0)).current;
  const arte = giftArt(event.gift.image);

  const destellos = useMemo(
    () =>
      Array.from({ length: DESTELLOS }, (_, i) => {
        const angulo = (i / DESTELLOS) * Math.PI * 2 + (i % 3) * 0.2;
        return { x: Math.cos(angulo) * 170, y: Math.sin(angulo) * 170 };
      }),
    [],
  );

  useEffect(() => {
    progreso.setValue(0);
    const animacion = Animated.timing(progreso, {
      toValue: 1,
      // Tres segundos: el temblor y la apertura se comen la primera mitad, así
      // que con menos la cifra apenas se veía un instante.
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animacion.start(({ finished }) => finished && onDone());
    return () => animacion.stop();
  }, [event.id, onDone, progreso]);

  // El temblor de la tapa antes de abrirse: cuatro sacudidas cortas y secas.
  const temblor = progreso.interpolate({
    inputRange: [0, 0.08, 0.16, 0.24, 0.32, 0.4, 1],
    outputRange: [0, -8, 8, -8, 8, 0, 0],
  });

  return (
    <View style={styles.capa} pointerEvents="none">
      {/* El estallido de luz, justo cuando la tapa cede. */}
      {destellos.map((destello, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.destello,
            {
              opacity: progreso.interpolate({ inputRange: [0, 0.42, 0.5, 0.78], outputRange: [0, 0, 1, 0] }),
              transform: [
                {
                  translateX: progreso.interpolate({
                    inputRange: [0, 0.45, 0.8],
                    outputRange: [0, 0, destello.x],
                  }),
                },
                {
                  translateY: progreso.interpolate({
                    inputRange: [0, 0.45, 0.8],
                    outputRange: [0, 0, destello.y],
                  }),
                },
              ],
            },
          ]}
        >
          ✨
        </Animated.Text>
      ))}

      <Animated.View
        style={{
          transform: [
            { translateX: temblor },
            // Se hincha al abrirse y luego se va apagando hacia atrás.
            { scale: progreso.interpolate({ inputRange: [0, 0.4, 0.5, 0.85, 1], outputRange: [1, 1.05, 1.5, 1.1, 0.9] }) },
          ],
          opacity: progreso.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
        }}
      >
        {arte ? (
          <Image source={arte} style={styles.cofre} contentFit="contain" />
        ) : (
          <Text style={styles.emoji}>{event.gift.emoji}</Text>
        )}
      </Animated.View>

      {/* El monto, una vez abierto. Sube y se queda un momento quieto: si
          siguiera subiendo hasta desaparecer no daría tiempo a leerlo. */}
      <Animated.View
        style={[
          styles.premio,
          {
            opacity: progreso.interpolate({
              inputRange: [0, 0.48, 0.58, 0.9, 1],
              outputRange: [0, 0, 1, 1, 0],
            }),
            transform: [
              { translateY: progreso.interpolate({ inputRange: [0.48, 0.72, 1], outputRange: [50, -10, -30] }) },
              {
                scale: progreso.interpolate({
                  inputRange: [0.48, 0.62, 0.72, 1],
                  outputRange: [0.4, 1.25, 1, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.monedas}>🪙 {event.coinsRewarded.toLocaleString('es')}</Text>
        <Text style={styles.destino} numberOfLines={1}>
          para {event.recipient.displayName}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  destello: { position: 'absolute', fontSize: 26 },
  cofre: { width: 150, height: 150 },
  emoji: { fontSize: 110 },

  premio: { position: 'absolute', alignItems: 'center', paddingHorizontal: spacing.lg },
  monedas: {
    color: colors.coin,
    fontSize: 46,
    fontWeight: '900',
    // Sin recuadro, lo que despega el número del vídeo es la sombra: negra y
    // ancha por debajo, que es lo que lo hace legible sobre cualquier fondo.
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  destino: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
