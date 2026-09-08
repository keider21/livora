import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../theme';

/**
 * Marca del premio, dentro del anuncio del regalo.
 *
 * Enseña **el multiplicador que acaba de salir**, no la suma de los anteriores:
 * si toca ×10 se ve 10, y si al siguiente toca ×500 se ve 500. Cada vez que
 * cambia, el número entra con un golpe de escala y un destello que cruza la
 * placa, con alas a los lados.
 *
 * El color sube de categoría con la cifra, y los escalones están separados a
 * propósito para que no cambie de color a cada rato: la mayoría de premios son
 * bajos y deben verse iguales entre sí.
 */
export function LuckyCounter({ multiplier, round }: { multiplier: number; round: number }) {
  const pop = useRef(new Animated.Value(0)).current;
  const brillo = useRef(new Animated.Value(0)).current;

  // Se anima cuando cambia la cifra, no en cada render del padre.
  useEffect(() => {
    pop.setValue(0);
    brillo.setValue(0);
    const animacion = Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 1, duration: 170, easing: Easing.out(Easing.back(2.6)), useNativeDriver: true }),
        Animated.spring(pop, { toValue: 0.5, friction: 5, useNativeDriver: true }),
      ]),
      Animated.timing(brillo, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    animacion.start();
    return () => animacion.stop();
    // `round` entra en las dependencias para que dos premios seguidos con la
    // misma cifra vuelvan a animarse en vez de quedarse quietos.
  }, [multiplier, round, pop, brillo]);

  const escala = pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1.5] });
  const paleta = paletaPara(multiplier);

  return (
    <Animated.View style={[styles.fila, { transform: [{ scale: escala }] }]}>
      <Text style={styles.ala}>✧</Text>

      <LinearGradient colors={paleta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.placa}>
        <Animated.View
          style={[
            styles.destello,
            {
              opacity: brillo.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.8, 0] }),
              transform: [
                { translateX: brillo.interpolate({ inputRange: [0, 1], outputRange: [-90, 90] }) },
                { rotate: '18deg' },
              ],
            },
          ]}
        />
        <Text style={styles.numero}>×{multiplier.toLocaleString('es')}</Text>
      </LinearGradient>

      <Text style={styles.ala}>✧</Text>
    </Animated.View>
  );
}

/**
 * Escalones de color. Separados a propósito: los premios pequeños son la
 * mayoría y conviene que compartan color, para que el cambio signifique algo.
 */
function paletaPara(multiplier: number): readonly [string, string] {
  if (multiplier >= 1000) return ['#FF6B4A', '#FF2D55'];
  if (multiplier >= 200) return ['#C77BFF', '#7B3CFF'];
  if (multiplier >= 50) return ['#5EE7FF', '#2D9BFF'];
  return ['#FFD24A', '#FF9A3C'];
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ala: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '900' },
  placa: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
  },
  destello: { position: 'absolute', width: 26, height: 60, backgroundColor: 'rgba(255,255,255,0.9)' },
  numero: { color: '#2A1300', fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
});
