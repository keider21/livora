import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';

/**
 * Marca del premio, dentro del anuncio del regalo.
 *
 * Enseña la suma de los multiplicadores del último envío que premió, y **crece
 * con el tamaño del premio**: un ×10 es una chapa discreta, un ×500 es morado y
 * más grande, y de ×1000 en adelante es dorado sobre negro y el doble de alto.
 * Un premio gordo tiene que distinguirse de lejos y no perderse entre la lluvia
 * de premios pequeños.
 *
 * El color de fondo del anuncio no lo decide esto, sino cuántos regalos lleva
 * enviados la racha: son dos cosas distintas a propósito, para que el fondo no
 * vaya y venga con cada acierto.
 */
export function LuckyCounter({ multiplier, round }: { multiplier: number; round: number }) {
  const pop = useRef(new Animated.Value(0)).current;
  const brillo = useRef(new Animated.Value(0)).current;
  const estilo = estiloPara(multiplier);

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

  // Los premios gordos rebotan más fuerte, que es parte de que se noten.
  const tope = multiplier >= 1000 ? 1.8 : multiplier >= 500 ? 1.6 : 1.5;
  const escala = pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, tope] });

  return (
    <Animated.View style={[styles.fila, { transform: [{ scale: escala }] }]}>
      <Text style={[styles.ala, { fontSize: estilo.ala }]}>✦</Text>

      <View style={[styles.placa, estilo.placa]}>
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
        <Text style={[styles.numero, estilo.numero]}>×{multiplier.toLocaleString('es')}</Text>
      </View>

      <Text style={[styles.ala, { fontSize: estilo.ala }]}>✦</Text>
    </Animated.View>
  );
}

/**
 * Cuánto tiempo queda protegido un premio antes de que otro más pequeño lo
 * sustituya en pantalla.
 *
 * Sin esto, con el envío automático un ×10 borraba el ×500 medio segundo
 * después de salir y nadie llegaba a verlo. Un premio más grande sí lo
 * sustituye al momento, porque esa es la buena noticia.
 */
export function proteccionPremio(multiplier: number): number {
  if (multiplier >= 1000) return 5000;
  if (multiplier >= 500) return 4000;
  return 1200;
}

/** Aspecto por tamaño de premio: cuanto más gordo, más grande y más llamativo. */
function estiloPara(multiplier: number) {
  if (multiplier >= 1000) return { ala: 15, placa: styles.placaDorada, numero: styles.numeroDorado };
  if (multiplier >= 500) return { ala: 13, placa: styles.placaMorada, numero: styles.numeroMorado };
  return { ala: 11, placa: styles.placaNormal, numero: styles.numeroNormal };
}

/**
 * Fondo del anuncio según **cuántos regalos lleva enviados** la racha, no según
 * el premio: así quien manda mucho se distingue a simple vista y el color no
 * cambia a cada acierto.
 */
export function paletaEnvio(cantidad: number): readonly [string, string] {
  if (cantidad >= 100_000) return ['#FFD24A', '#B37700'];
  if (cantidad >= 10_000) return ['#FF2D55', '#8C0026'];
  if (cantidad >= 5_000) return ['#7B3CFF', '#33108C'];
  if (cantidad >= 1_000) return ['#2D9BFF', '#0B4FA8'];
  return ['rgba(0,230,118,0.6)', 'rgba(0,120,64,0.6)'];
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ala: { color: 'rgba(255,255,255,0.92)', fontWeight: '900' },
  placa: { justifyContent: 'center', borderRadius: 8, overflow: 'hidden' },
  destello: { position: 'absolute', width: 26, height: 60, backgroundColor: 'rgba(255,255,255,0.9)' },
  numero: { fontWeight: '900', letterSpacing: -0.3 },

  // Premios pequeños: discreta, para que no compita con el fondo del anuncio.
  placaNormal: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    backgroundColor: 'rgba(5,10,7,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  numeroNormal: { color: '#FFFFFF', fontSize: 15 },

  // Desde ×500: morado, más grande.
  placaMorada: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    backgroundColor: '#5B1DB8',
    borderWidth: 2,
    borderColor: '#E0C3FF',
  },
  numeroMorado: { color: '#F3E4FF', fontSize: 21 },

  // Desde ×1000: dorado sobre negro, el más grande de todos.
  placaDorada: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    backgroundColor: '#0B0700',
    borderWidth: 2.5,
    borderColor: '#FFD24A',
  },
  numeroDorado: { color: '#FFD24A', fontSize: 27 },
});
