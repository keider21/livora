import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import type { GiftEvent } from '../realtime/events';
import { giftArt } from './gift-art';
import { Avatar } from './ui';
import { BANNER, paletaDeRecompensa } from './reward-theme';

const MONEDA = require('../../assets/gifts/reward-coin.png');

/**
 * Banner de recompensa: lo que sale cuando un regalo explota.
 *
 * ## Por qué está dibujado y no es una imagen
 *
 * Todo lo que se ve —placa, bordes metálicos, resplandor, partículas— son vistas
 * y degradados. La única imagen es la moneda. Eso es lo que permite cambiar el
 * color según lo gordo que sea el premio tocando una paleta, en vez de exportar
 * un juego de láminas por cada nivel, y es también lo que hace que se vea nítido
 * en cualquier pantalla en vez de estirado.
 *
 * ## La jerarquía
 *
 * Tres tamaños distintos a propósito: el **nombre** manda, el **multiplicador**
 * es lo que se mira después y la **cantidad** va al final. Si los tres fueran
 * iguales habría que leerlos para entenderlos, y esto dura dos segundos.
 *
 * El multiplicador vive en su propia columna, separado del nombre por el ancho
 * de la placa: pegados, el ojo los lee como una sola frase y se pierde el golpe.
 *
 * ## La entrada, por fases
 *
 * Ráfaga de energía, moneda, placa que se expande, nombre que entra deslizando y
 * por último el multiplicador con su impacto. Cada cosa llega cuando la anterior
 * ya se está viendo: todo a la vez sería un estallido y no se entendería nada.
 */
export function RewardBanner({
  event,
  quantity,
  coinsRewarded,
  times,
  luckyRound,
}: {
  event: GiftEvent;
  /** Unidades acumuladas del combo. */
  quantity: number;
  /** Monedas que se llevó este destinatario. */
  coinsRewarded: number;
  /** Multiplicador del premio, que es la cifra protagonista. */
  times: number;
  /** Sube con cada premio nuevo: relanza el impacto de la cifra. */
  luckyRound: number;
}) {
  const paleta = useMemo(() => paletaDeRecompensa(times), [times]);
  const entrada = useRef(new Animated.Value(0)).current;
  const impacto = useRef(new Animated.Value(0)).current;
  const barrido = useRef(new Animated.Value(0)).current;

  // Las partículas se reparten una vez y se quedan: si se recalcularan en cada
  // render saltarían de sitio con cada envío.
  const particulas = useMemo(
    () =>
      Array.from({ length: paleta.particulas }, (_, i) => ({
        x: 6 + ((i * 37) % (BANNER.ancho - 20)),
        y: 4 + ((i * 23) % (BANNER.alto - 12)),
        tam: 2 + (i % 3),
        retraso: (i % 5) * 160,
        alcance: 10 + (i % 4) * 6,
      })),
    [paleta.particulas],
  );

  useEffect(() => {
    entrada.setValue(0);
    const animacion = Animated.timing(entrada, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [entrada]);

  // El impacto de la cifra se relanza con cada premio, no con cada render.
  useEffect(() => {
    impacto.setValue(0);
    const animacion = Animated.sequence([
      Animated.delay(260),
      Animated.timing(impacto, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(2.4)),
        useNativeDriver: true,
      }),
    ]);
    animacion.start();
    return () => animacion.stop();
  }, [times, luckyRound, impacto]);

  // El destello que recorre el borde no para: es lo que mantiene vivo el marco
  // mientras el anuncio está quieto esperando a que lleguen más envíos.
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(barrido, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );
    bucle.start();
    return () => bucle.stop();
  }, [barrido]);

  const arte = giftArt(event.gift.image);

  return (
    <View style={styles.envoltura} pointerEvents="none">
      {/* 1 · la ráfaga: llega antes que nada y se apaga enseguida */}
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: paleta.halo,
            opacity: entrada.interpolate({ inputRange: [0, 0.18, 0.5, 1], outputRange: [0, 0.9, 0.5, 0.3] }),
            transform: [
              { scaleX: entrada.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.12, 1] }) },
            ],
          },
        ]}
      />

      {/* 3 · la placa, que se expande desde el centro */}
      <Animated.View
        style={{
          transform: [
            { scaleX: entrada.interpolate({ inputRange: [0, 0.35, 0.6, 1], outputRange: [0.35, 1.04, 0.99, 1] }) },
            { scaleY: entrada.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.6, 1, 1] }) },
          ],
          opacity: entrada.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        }}
      >
        <LinearGradient
          colors={paleta.borde}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.marco}
        >
          <LinearGradient colors={paleta.fondo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.placa}>
            {/* partículas doradas, por detrás del texto */}
            {particulas.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particula,
                  {
                    left: p.x,
                    top: p.y,
                    width: p.tam,
                    height: p.tam,
                    borderRadius: p.tam,
                    backgroundColor: paleta.chispa,
                    opacity: barrido.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.15, 0.7, 0.15],
                    }),
                    transform: [
                      {
                        translateY: barrido.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -p.alcance],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}

            {/* el destello que recorre el borde */}
            <Animated.View
              style={[
                styles.destello,
                {
                  opacity: barrido.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.55, 0.35, 0] }),
                  transform: [
                    {
                      translateX: barrido.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-90, BANNER.ancho],
                      }),
                    },
                    { rotate: '14deg' },
                  ],
                },
              ]}
            />

            <View style={styles.contenido}>
              {/* 4 · quién lo mandó, deslizando */}
              <Animated.View
                style={[
                  styles.identidad,
                  {
                    opacity: entrada.interpolate({ inputRange: [0, 0.4, 0.62, 1], outputRange: [0, 0, 1, 1] }),
                    transform: [
                      {
                        translateX: entrada.interpolate({
                          inputRange: [0, 0.45, 0.75, 1],
                          outputRange: [-14, -14, 0, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Avatar uri={event.sender.avatarUrl} name={event.sender.displayName} size={30} ring />
                <View style={styles.textos}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {event.sender.displayName}
                  </Text>
                  <Text style={styles.accion} numberOfLines={1}>
                    envió {quantity > 1 ? `${quantity}× ` : ''}
                    {event.gift.name}
                  </Text>
                </View>
              </Animated.View>

              {/* 5 · el multiplicador, en su propia columna y con impacto */}
              <Animated.View
                style={[
                  styles.columnaCifra,
                  {
                    opacity: impacto.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
                    transform: [
                      { scale: impacto.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.22, 1] }) },
                    ],
                  },
                ]}
              >
                <MaskedView
                  maskElement={
                    <View style={styles.mascara}>
                      <Text style={[styles.multiplicador, styles.mascaraTexto]}>×{times.toLocaleString('es')}</Text>
                    </View>
                  }
                >
                  <LinearGradient
                    colors={paleta.cifra}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.relleno}
                  >
                    <Text style={[styles.multiplicador, styles.invisible]}>×{times.toLocaleString('es')}</Text>
                  </LinearGradient>
                </MaskedView>

                {/* 6 · debajo, el icono del regalo y la cantidad */}
                <View style={styles.cantidad}>
                  {arte ? (
                    <Image source={arte} style={styles.icono} contentFit="contain" />
                  ) : (
                    <Text style={styles.iconoEmoji}>{event.gift.emoji}</Text>
                  )}
                  <Text style={styles.monedas} numberOfLines={1}>
                    {coinsRewarded.toLocaleString('es')}
                  </Text>
                </View>
              </Animated.View>
            </View>
          </LinearGradient>
        </LinearGradient>
      </Animated.View>

      {/* 2 · la moneda, por encima del borde y sobresaliendo a la izquierda */}
      <Animated.View
        style={[
          styles.moneda,
          {
            opacity: entrada.interpolate({ inputRange: [0, 0.12, 0.3, 1], outputRange: [0, 0.4, 1, 1] }),
            transform: [
              { scale: entrada.interpolate({ inputRange: [0, 0.3, 0.5, 1], outputRange: [0.3, 1.15, 0.98, 1] }) },
              {
                rotate: entrada.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'] }),
              },
            ],
          },
        ]}
      >
        <Image source={MONEDA} style={styles.monedaArte} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // La moneda se sale del marco, así que la envoltura reserva su sitio a la
  // izquierda en vez de dejar que la recorten.
  envoltura: {
    width: BANNER.ancho + BANNER.moneda * 0.45,
    height: BANNER.alto + 16,
    justifyContent: 'center',
    paddingLeft: BANNER.moneda * 0.45,
  },

  halo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    bottom: 6,
    borderRadius: 40,
  },

  // El marco es un degradado de 1,5 px: es lo que da el filo metálico sin
  // pintar un borde plano, que es lo que se ve barato.
  marco: { borderRadius: 14, padding: 1.5 },
  placa: { borderRadius: 12.5, overflow: 'hidden', height: BANNER.alto },
  contenido: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: BANNER.moneda * 0.52,
    paddingRight: 12,
    gap: 8,
  },

  particula: { position: 'absolute' },
  destello: {
    position: 'absolute',
    top: -20,
    width: 46,
    height: BANNER.alto + 40,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  identidad: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  textos: { flex: 1 },
  // El nombre manda: es el texto más grande de la composición.
  nombre: {
    color: '#FFF4D6',
    fontSize: 15,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  accion: { color: 'rgba(255,228,170,0.72)', fontSize: 9.5, fontWeight: '600' },

  columnaCifra: { alignItems: 'flex-end', gap: 1 },
  mascara: { backgroundColor: 'transparent' },
  mascaraTexto: { color: '#000000' },
  relleno: { justifyContent: 'center' },
  invisible: { opacity: 0 },
  multiplicador: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontStyle: 'italic',
  },

  cantidad: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  icono: { width: 14, height: 14 },
  iconoEmoji: { fontSize: 12 },
  monedas: {
    color: '#FFD98A',
    fontSize: 13,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  moneda: {
    position: 'absolute',
    left: 0,
    width: BANNER.moneda,
    height: BANNER.moneda,
    justifyContent: 'center',
  },
  monedaArte: { width: '100%', height: '100%' },
});
