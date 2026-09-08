import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ApiError, chests as chestsApi } from '../api';
import type { Chest, ChestOpenResult } from '../api/types';
import { useAuthStore } from '../store/auth-store';
import { Button } from './ui';
import { colors, formatCount, radius, spacing } from '../theme';

const CANTIDADES = [1, 10, 50];

/**
 * Cofres, dentro de la caja de regalos.
 *
 * Van junto a los regalos de la suerte porque es el mismo impulso: se juega el
 * saldo a que salga más de lo que cuesta. Tenerlos en el perfil los dejaba
 * lejos del momento en que apetece probar suerte, que es en mitad del directo.
 *
 * Aquí no hay anfitrión ni diamantes de por medio, es el jugador contra la
 * casa, así que se enseña sin adornos lo que cuesta, lo que puede tocar y cada
 * cuánto premia.
 */
export function ChestPanel({ onRecharge }: { onRecharge: () => void }) {
  const user = useAuthStore((state) => state.user);
  const setWallet = useAuthStore((state) => state.setWallet);

  const [cofres, setCofres] = useState<Chest[]>([]);
  const [elegido, setElegido] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [abriendo, setAbriendo] = useState(false);
  const [resultado, setResultado] = useState<ChestOpenResult | null>(null);

  useEffect(() => {
    void chestsApi
      .list()
      .then((data) => {
        setCofres(data.cofres);
        setElegido((actual) => actual ?? data.cofres[0]?.code ?? null);
      })
      .catch(() => undefined);
  }, []);

  const cofre = cofres.find((item) => item.code === elegido) ?? null;
  const coste = cofre ? cofre.precio * cantidad : 0;
  const alcanza = (user?.coins ?? 0) >= coste;

  const abrir = useCallback(async () => {
    if (!cofre) return;
    setAbriendo(true);
    try {
      const data = await chestsApi.open(cofre.code, cantidad);
      setResultado(data);
      setWallet(data.wallet);
      void Haptics.impactAsync(
        data.ganado > 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
      );
    } catch (error) {
      Alert.alert('No se pudo abrir', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setAbriendo(false);
    }
  }, [cofre, cantidad, setWallet]);

  return (
    <View style={styles.panel}>
      {/* Sin ScrollView: son tres cofres y caben. Un ScrollView dentro de una
          hoja que se ajusta al contenido se queda sin altura y no se ve nada. */}
      <View style={styles.lista}>
        {cofres.map((item) => {
          const activo = item.code === elegido;
          return (
            <Pressable key={item.code} onPress={() => setElegido(item.code)}>
              <LinearGradient
                colors={activo ? ['#3A2A0B', '#1A1206'] : ['#111A15', '#0B120E']}
                style={[styles.cofre, activo && styles.cofreActivo]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.textos}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <Text style={styles.precio}>🪙 {item.precio.toLocaleString('es')} por cofre</Text>
                  <Text style={styles.probabilidad}>
                    Premia el {item.probabilidad.toFixed(1)}% · hasta {formatCount(Math.max(...item.premios))}
                  </Text>
                </View>
                {activo ? (
                  <View style={styles.premios}>
                    {item.premios.map((premio) => (
                      <Text key={premio} style={styles.premio}>
                        {formatCount(premio)}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </LinearGradient>
            </Pressable>
          );
        })}

        {resultado ? (
          <View style={[styles.resultado, resultado.ganado > 0 ? styles.resultadoBueno : styles.resultadoSeco]}>
            <Text style={styles.resultadoCifra}>
              {resultado.ganado > 0 ? `🪙 +${resultado.ganado.toLocaleString('es')}` : 'Nada esta vez'}
            </Text>
            <Text style={styles.resultadoDetalle}>
              {resultado.cantidad === 1
                ? `Abriste 1 ${resultado.cofre.nombre.toLowerCase()}`
                : `Abriste ${resultado.cantidad} · premiaron ${resultado.premios.filter((premio) => premio > 0).length}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cantidades}>
        {CANTIDADES.map((valor) => (
          <Pressable
            key={valor}
            onPress={() => setCantidad(valor)}
            style={[styles.cantidad, cantidad === valor && styles.cantidadActiva]}
          >
            <Text style={[styles.cantidadTexto, cantidad === valor && { color: colors.onPrimary }]}>×{valor}</Text>
          </Pressable>
        ))}
      </View>

      <Button
        label={
          !cofre
            ? 'Elige un cofre'
            : alcanza
              ? `Abrir por 🪙 ${coste.toLocaleString('es')}`
              : 'Recargar monedas'
        }
        loading={abriendo}
        disabled={!cofre}
        // Igual que con los regalos: sin saldo el botón lleva a recargar en vez
        // de apagarse y dejar al jugador sin salida.
        onPress={() => (alcanza ? void abrir() : onRecharge())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
  lista: { gap: spacing.sm },

  cofre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cofreActivo: { borderColor: colors.coin },
  emoji: { fontSize: 30 },
  textos: { flex: 1, gap: 1 },
  nombre: { color: colors.text, fontSize: 14, fontWeight: '800' },
  precio: { color: colors.coin, fontSize: 12, fontWeight: '700' },
  probabilidad: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },

  premios: { alignItems: 'flex-end', gap: 1, maxWidth: 74 },
  premio: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },

  resultado: { borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 2, borderWidth: 2 },
  resultadoBueno: { borderColor: colors.coin, backgroundColor: 'rgba(255,210,74,0.12)' },
  resultadoSeco: { borderColor: colors.border, backgroundColor: colors.surface },
  resultadoCifra: { color: colors.text, fontSize: 20, fontWeight: '900' },
  resultadoDetalle: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  cantidades: { flexDirection: 'row', gap: spacing.sm },
  cantidad: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cantidadActiva: { backgroundColor: colors.coin, borderColor: colors.coin },
  cantidadTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
