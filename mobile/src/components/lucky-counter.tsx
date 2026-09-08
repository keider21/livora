import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../theme';

/**
 * Contador de premio acumulado, sobre el anuncio del regalo.
 *
 * Enseña la **suma** de los multiplicadores que han salido, no el último ni el
 * mejor: dos aciertos de ×500 son «1000 TIMES». Cada vez que sube, el número
 * anterior se sustituye con un golpe de escala y un destello, que es lo que hace
 * que una racha se sienta como una racha.
 *
 * El color sube de categoría con la cifra, como en las apps del sector: dorado
 * de normal, morado a partir de 500 y rojo a partir de 2000.
 */
export function LuckyCounter({ times, coins }: { times: number; coins: number }) {
  const pop = useRef(new Animated.Value(0)).current;
  const brillo = useRef(new Animated.Value(0)).current;

  // Se anima cada vez que cambia la cifra, no en cada render del padre.
  useEffect(() => {
    pop.setValue(0);
    brillo.setValue(0);
    const animacion = Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 1, duration: 160, easing: Easing.out(Easing.back(2.4)), useNativeDriver: true }),
        Animated.spring(pop, { toValue: 0.5, friction: 5, useNativeDriver: true }),
      ]),
      Animated.timing(brillo, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    animacion.start();
    return () => animacion.stop();
  }, [times, pop, brillo]);

  const escala = pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.06, 1.45] });
  const paleta = times >= 2000 ? GRADIENTES.rojo : times >= 500 ? GRADIENTES.morado : GRADIENTES.dorado;

  return (
    <Animated.View style={[styles.contenedor, { transform: [{ scale: escala }] }]}>
      <LinearGradient colors={paleta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.placa}>
        {/* Destello que cruza la placa al subir la cifra. */}
        <Animated.View
          style={[
            styles.destello,
            {
              opacity: brillo.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.75, 0] }),
              transform: [
                { translateX: brillo.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] }) },
                { rotate: '18deg' },
              ],
            },
          ]}
        />
        <Text style={styles.numero}>×{times.toLocaleString('es')}</Text>
        <Text style={styles.etiqueta}>TIMES</Text>
      </LinearGradient>

      <View style={styles.monedas}>
        <Text style={styles.monedasTexto}>🪙 +{coins.toLocaleString('es')}</Text>
      </View>
    </Animated.View>
  );
}

const GRADIENTES = {
  dorado: ['#FFD24A', '#FF9A3C'] as const,
  morado: ['#C77BFF', '#7B3CFF'] as const,
  rojo: ['#FF6B4A', '#FF2D55'] as const,
};

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', alignSelf: 'flex-start', gap: 2 },
  placa: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
  },
  destello: { position: 'absolute', width: 40, height: 120, backgroundColor: 'rgba(255,255,255,0.9)' },
  numero: { color: '#2A1300', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  etiqueta: { color: '#2A1300', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: -3 },
  monedas: {
    backgroundColor: 'rgba(5,10,7,0.8)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  monedasTexto: { color: colors.coin, fontSize: 11, fontWeight: '800' },
});
