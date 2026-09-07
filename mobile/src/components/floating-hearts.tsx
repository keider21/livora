import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

/**
 * Corazón que sube y se apaga, como los de TikTok Live.
 *
 * Cada uno nace donde se tocó la pantalla, sube con una curva propia y se borra
 * solo al terminar. La curva se sortea al nacer y se guarda en una ref: si se
 * recalculara en cada fotograma, el corazón temblaría.
 */
export interface HeartSpec {
  id: number;
  x: number;
  y: number;
}

export function FloatingHeart({ heart, onDone }: { heart: HeartSpec; onDone: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const curva = useRef({
    deriva: (Math.random() - 0.5) * 90,
    giro: (Math.random() - 0.5) * 40,
    escala: 0.75 + Math.random() * 0.6,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!,
  }).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && onDone(heart.id));
    return () => animation.stop();
  }, [heart.id, onDone, progress]);

  return (
    <Animated.Text
      style={[
        styles.heart,
        {
          left: heart.x - 16,
          top: heart.y - 16,
          opacity: progress.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -220] }) },
            {
              translateX: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, curva.deriva, curva.deriva * 0.4],
              }),
            },
            { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${curva.giro}deg`] }) },
            { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, curva.escala, curva.escala * 0.9] }) },
          ],
        },
      ]}
    >
      {curva.emoji}
    </Animated.Text>
  );
}

const EMOJIS = ['❤️', '💚', '💛', '💖', '✨'];

const styles = StyleSheet.create({
  heart: { position: 'absolute', fontSize: 32, color: colors.live },
});
