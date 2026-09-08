import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ApiError, chests as chestsApi } from '../src/api';
import type { Chest, ChestOpenResult } from '../src/api/types';
import { useAuthStore } from '../src/store/auth-store';
import { Button, Loader } from '../src/components/ui';
import { colors, formatCount, radius, spacing, typography } from '../src/theme';

const CANTIDADES = [1, 10, 50];

/**
 * Cofres: el juego de azar aparte de los regalos.
 *
 * Se paga un precio fijo y a veces devuelve monedas. Aquí no hay anfitrión ni
 * diamantes de por medio, es el jugador contra la casa, así que la pantalla
 * enseña sin adornos lo que cuesta, lo que puede tocar y con qué probabilidad.
 */
export default function ChestsScreen() {
  const router = useRouter();
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

  if (cofres.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Loader label="Cargando cofres…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cabecera}>
        <Text style={typography.title}>Cofres</Text>
        <View style={styles.saldo}>
          <Text style={styles.saldoTexto}>🪙 {(user?.coins ?? 0).toLocaleString('es')}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        {cofres.map((item) => {
          const activo = item.code === elegido;
          return (
            <Pressable key={item.code} onPress={() => setElegido(item.code)}>
              <LinearGradient
                colors={activo ? ['#3A2A0B', '#1A1206'] : ['#111A15', '#0B120E']}
                style={[styles.cofre, activo && styles.cofreActivo]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.cofreTextos}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <Text style={styles.precio}>🪙 {item.precio.toLocaleString('es')} por cofre</Text>
                  <Text style={styles.probabilidad}>
                    Premia el {item.probabilidad.toFixed(1)}% de las veces · hasta{' '}
                    {formatCount(Math.max(...item.premios))}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}

        {cofre ? (
          <View style={styles.premios}>
            <Text style={styles.premiosTitulo}>Lo que puede tocar</Text>
            <View style={styles.premiosLista}>
              {cofre.premios.map((premio) => (
                <View key={premio} style={styles.premio}>
                  <Text style={styles.premioTexto}>🪙 {premio.toLocaleString('es')}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

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
      </ScrollView>

      <View style={styles.pie}>
        <View style={styles.cantidades}>
          {CANTIDADES.map((valor) => (
            <Pressable
              key={valor}
              onPress={() => setCantidad(valor)}
              style={[styles.cantidad, cantidad === valor && styles.cantidadActiva]}
            >
              <Text style={[styles.cantidadTexto, cantidad === valor && { color: colors.onPrimary }]}>
                ×{valor}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          label={alcanza ? `Abrir por 🪙 ${coste.toLocaleString('es')}` : 'Monedas insuficientes'}
          loading={abriendo}
          disabled={!cofre || !alcanza}
          onPress={() => void abrir()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
  },
  saldo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  saldoTexto: { color: colors.coin, fontWeight: '800', fontSize: 14 },
  contenido: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  cofre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cofreActivo: { borderColor: colors.coin },
  emoji: { fontSize: 38 },
  cofreTextos: { flex: 1, gap: 2 },
  nombre: { color: colors.text, fontSize: 16, fontWeight: '800' },
  precio: { color: colors.coin, fontSize: 13, fontWeight: '700' },
  probabilidad: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  premios: { gap: spacing.sm },
  premiosTitulo: { ...typography.label },
  premiosLista: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  premio: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  premioTexto: { color: colors.text, fontSize: 11, fontWeight: '700' },

  resultado: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: 2, borderWidth: 2 },
  resultadoBueno: { borderColor: colors.coin, backgroundColor: 'rgba(255,210,74,0.12)' },
  resultadoSeco: { borderColor: colors.border, backgroundColor: colors.surface },
  resultadoCifra: { color: colors.text, fontSize: 24, fontWeight: '900' },
  resultadoDetalle: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  pie: { padding: spacing.lg, gap: spacing.sm },
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
