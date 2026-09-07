import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import type { GiftEvent } from '../realtime/events';
import { giftArt } from './gift-art';
import { colors, radius, spacing } from '../theme';

/**
 * Escena de los regalos exclusivos.
 *
 * Estos no explotan ni devuelven monedas: lo que ofrecen es esto. En vez de la
 * lluvia de emojis de los normales, se monta una escena por fases sobre toda la
 * pantalla, que es lo que hace que un regalo caro se note en la sala:
 *
 *   1. la sala se oscurece y nace un halo en el centro
 *   2. salen rayos de luz que giran
 *   3. la figura entra con rebote y queda flotando
 *   4. partículas orbitan a su alrededor
 *   5. tres ondas de choque se expanden
 *   6. una banda de luz barre la pantalla
 *   7. entra la placa con el nombre de quien lo envía
 *
 * Todo va con `Animated` sobre un único valor maestro: cada capa interpola el
 * mismo progreso en su tramo, así que las fases encajan sin temporizadores
 * sueltos que puedan desincronizarse.
 *
 * Los colores salen del regalo. Para meter animaciones dibujadas (Lottie) el
 * sitio es este: bastaría con pintar el reproductor donde ahora va la figura.
 */

const { width: ANCHO, height: ALTO } = Dimensions.get('window');
const DURACION = 4200;
const RAYOS = 14;
const PARTICULAS = 16;

/** Paleta por regalo. El que no esté usa el dorado de la marca. */
const TEMAS: Record<string, { principal: string; brillo: string; particula: string }> = {
  phoenix: { principal: '#FF7A18', brillo: 'rgba(255,122,24,0.55)', particula: '🔥' },
  galaxy: { principal: '#A77BFF', brillo: 'rgba(167,123,255,0.55)', particula: '✨' },
  dragon: { principal: '#38EF7D', brillo: 'rgba(56,239,125,0.55)', particula: '🍃' },
  'fan-bracelet': { principal: '#FF6EC7', brillo: 'rgba(255,110,199,0.5)', particula: '💗' },
  'fan-jacket': { principal: '#FF6EC7', brillo: 'rgba(255,110,199,0.5)', particula: '💗' },
  'fan-throne': { principal: '#FFD24A', brillo: 'rgba(255,210,74,0.55)', particula: '👑' },
  'lion-imperial': { principal: '#FFC53D', brillo: 'rgba(255,197,61,0.6)', particula: '✨' },
};

const TEMA_POR_DEFECTO = { principal: colors.coin, brillo: 'rgba(255,210,74,0.55)', particula: '✨' };

export function GiftAura({ event, onDone }: { event: GiftEvent; onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  const tema = TEMAS[event.gift.code] ?? TEMA_POR_DEFECTO;
  // Los regalos con ilustración la dibujan en grande; el resto, su emoji.
  const arte = giftArt(event.gift.image);

  const rayos = useMemo(() => Array.from({ length: RAYOS }, (_, i) => (i / RAYOS) * 360), []);
  const particulas = useMemo(
    () =>
      Array.from({ length: PARTICULAS }, (_, i) => ({
        angulo: (i / PARTICULAS) * Math.PI * 2,
        radio: 110 + (i % 4) * 26,
        retraso: (i % 5) * 0.04,
      })),
    [],
  );

  useEffect(() => {
    progress.setValue(0);
    spin.setValue(0);
    orbit.setValue(0);

    // El giro y la órbita son continuos; el resto entra y sale con el maestro.
    // Si compartieran curva, se pararían en seco al desvanecerse la escena.
    const giro = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
    );
    const orbita = Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 3400, easing: Easing.linear, useNativeDriver: true }),
    );
    const maestro = Animated.timing(progress, {
      toValue: 1,
      duration: DURACION,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    giro.start();
    orbita.start();
    maestro.start(({ finished }) => finished && onDone());

    return () => {
      giro.stop();
      orbita.stop();
      maestro.stop();
    };
  }, [event.id, onDone, orbit, progress, spin]);

  /** Atajo: valor que sube en un tramo, se mantiene, y baja al final. */
  const tramo = (entra: number, sale: number) =>
    progress.interpolate({
      inputRange: [0, entra, sale, 1],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    });

  const velo = tramo(0.08, 0.86);
  const halo = tramo(0.1, 0.85);
  const figura = tramo(0.18, 0.88);
  const placa = tramo(0.32, 0.9);

  const giroRayos = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 1 · la sala se apaga para que la escena mande */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.velo, { opacity: velo }]} />

      {/* 2 · rayos girando detrás */}
      <Animated.View style={[styles.centrado, { opacity: halo, transform: [{ rotate: giroRayos }] }]}>
        {rayos.map((angulo) => (
          <View
            key={angulo}
            style={[styles.rayo, { backgroundColor: tema.brillo, transform: [{ rotate: `${angulo}deg` }] }]}
          />
        ))}
      </Animated.View>

      {/* 3 · halo que respira */}
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: halo,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.2, 1.5, 1.9] }) },
            ],
          },
        ]}
      >
        <LinearGradient colors={[tema.brillo, 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* 4 · ondas de choque */}
      {[0, 1, 2].map((i) => {
        const inicio = 0.22 + i * 0.12;
        return (
          <Animated.View
            key={i}
            style={[
              styles.onda,
              {
                borderColor: tema.principal,
                opacity: progress.interpolate({
                  inputRange: [inicio, inicio + 0.05, inicio + 0.28],
                  outputRange: [0, 0.85, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: progress.interpolate({
                      inputRange: [inicio, inicio + 0.28],
                      outputRange: [0.2, 2.6],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}

      {/* 5 · partículas en órbita */}
      <Animated.View style={[styles.centrado, { opacity: figura }]}>
        {particulas.map((particula, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.particula,
              {
                transform: [
                  {
                    translateX: orbit.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        Math.cos(particula.angulo) * particula.radio,
                        Math.cos(particula.angulo + Math.PI * 2) * particula.radio,
                      ],
                    }),
                  },
                  {
                    translateY: orbit.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [
                        Math.sin(particula.angulo) * particula.radio,
                        Math.sin(particula.angulo + Math.PI) * particula.radio * 0.6,
                        Math.sin(particula.angulo + Math.PI * 2) * particula.radio,
                      ],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0.2 + particula.retraso, 0.4 + particula.retraso, 0.9],
                      outputRange: [0, 1, 0.7],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            {tema.particula}
          </Animated.Text>
        ))}
      </Animated.View>

      {/* 6 · la figura entra con rebote y flota */}
      <Animated.View
        style={[
          styles.figuraCaja,
          {
            opacity: figura,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0.14, 0.3, 0.4, 0.9, 1],
                  outputRange: [0.2, 1.35, 1, 1.05, 0.8],
                  extrapolate: 'clamp',
                }),
              },
              {
                translateY: progress.interpolate({
                  inputRange: [0.3, 0.65, 1],
                  outputRange: [0, -14, -60],
                  extrapolate: 'clamp',
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0.14, 0.4, 0.7, 1],
                  outputRange: ['-25deg', '6deg', '-4deg', '0deg'],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        {arte ? (
          <Image source={arte} style={styles.ilustracion} contentFit="contain" />
        ) : (
          <Text style={styles.figura}>{event.gift.emoji}</Text>
        )}
      </Animated.View>

      {/* 7 · banda de luz que barre la pantalla */}
      <Animated.View
        style={[
          styles.barrido,
          {
            opacity: progress.interpolate({
              inputRange: [0.34, 0.42, 0.6, 0.68],
              outputRange: [0, 0.9, 0.9, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0.34, 0.68],
                  outputRange: [-ANCHO, ANCHO],
                  extrapolate: 'clamp',
                }),
              },
              { rotate: '18deg' },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* 8 · placa con el nombre */}
      <Animated.View
        style={[
          styles.placaContenedor,
          {
            opacity: placa,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0.28, 0.4],
                  outputRange: [40, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.placa, { borderColor: tema.principal }]}>
          <Text style={[styles.remitente, { color: tema.principal }]} numberOfLines={1}>
            {event.sender.displayName}
          </Text>
          <Text style={styles.detalle} numberOfLines={1}>
            envió {event.gift.name} a {event.recipient.displayName}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const HALO = 340;

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  velo: { backgroundColor: 'rgba(5,10,7,0.55)' },
  centrado: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  rayo: { position: 'absolute', width: 3, height: ALTO * 0.8 },
  halo: { position: 'absolute', width: HALO, height: HALO, borderRadius: HALO / 2, overflow: 'hidden' },
  onda: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 2 },
  particula: { position: 'absolute', fontSize: 22 },
  figuraCaja: { alignItems: 'center', justifyContent: 'center' },
  figura: { fontSize: 120 },
  // Grande pero sin llegar al borde: las ondas y las partículas se ven detrás.
  ilustracion: { width: ANCHO * 0.82, height: ANCHO * 0.82 },
  barrido: { position: 'absolute', width: ANCHO * 0.5, height: ALTO * 1.6 },
  placaContenedor: { position: 'absolute', bottom: '22%' },
  placa: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,10,7,0.85)',
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  remitente: { fontSize: 20, fontWeight: '900' },
  detalle: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
