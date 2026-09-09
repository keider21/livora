import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { GiftEvent } from '../realtime/events';
import { giftArt } from './gift-art';


const DESTELLOS = 14;

/**
 * El cofre abriéndose en medio de la sala.
 *
 * Un cofre siempre explota, así que la gracia no está en si toca sino en cuánto:
 * primero tiembla, luego se abre de golpe con un estallido de luz y solo
 * entonces sube la cifra. Ese orden es lo que hace la espera; enseñar el número
 * a la vez que el cofre le quitaría el momento.
 *
 * **La cifra no va aquí.** La lleva el anuncio de abajo, con el nombre de quien
 * lo mandó y de quien lo recibe. Escribirla también en el centro ponía el mismo
 * número dos veces en pantalla a la vez, y encima tapando la animación que se
 * supone que hay que mirar.
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
      duration: 2200,
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
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  destello: { position: 'absolute', fontSize: 26 },
  cofre: { width: 150, height: 150 },
  emoji: { fontSize: 110 },
});
