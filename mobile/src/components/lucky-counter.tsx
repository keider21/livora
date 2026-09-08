import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';

/**
 * Marca del premio, dentro del anuncio del regalo.
 *
 * Enseña la suma de los multiplicadores del último envío que premió. Cada vez
 * que cambia, el número entra con un golpe de escala y un destello que cruza la
 * placa, con alas a los lados.
 *
 * **El color de categoría no va aquí**: lo lleva el fondo del anuncio, detrás
 * del nombre. La marca va en oscuro con el número en blanco para que resalte
 * sobre cualquiera de esos fondos; si compartiera color con el fondo, el número
 * se perdería justo cuando más grande es el premio.
 *
 * Los escalones están separados a propósito para que el fondo no cambie de tono
 * a cada rato: la mayoría de premios son bajos y deben verse iguales entre sí.
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

  return (
    <Animated.View style={[styles.fila, { transform: [{ scale: escala }] }]}>
      <Text style={styles.ala}>✧</Text>

      <View style={styles.placa}>
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
      </View>

      <Text style={styles.ala}>✧</Text>
    </Animated.View>
  );
}

/**
 * Fondo del anuncio según el tamaño del premio. Lo usa `GiftAnimation`, que es
 * quien pinta ese fondo; aquí vive porque los escalones son los de esta marca.
 *
 * Separados a propósito: los premios pequeños son la mayoría y conviene que
 * compartan color, para que el cambio signifique algo.
 */
export function paletaPremio(multiplier: number): readonly [string, string] {
  if (multiplier >= 1000) return ['#FF2D55', '#B3003C'];
  if (multiplier >= 200) return ['#7B3CFF', '#3E1B99'];
  if (multiplier >= 50) return ['#2D9BFF', '#0B4FA8'];
  return ['#FF9A3C', '#B35C00'];
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ala: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '900' },
  // Oscura y con borde claro: resalta sobre cualquiera de los fondos de
  // categoría, que son todos saturados.
  placa: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(5,10,7,0.9)',
    overflow: 'hidden',
  },
  destello: { position: 'absolute', width: 26, height: 60, backgroundColor: 'rgba(255,255,255,0.9)' },
  numero: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
});
