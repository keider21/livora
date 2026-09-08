import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { SalaryProgress } from '../api/types';
import { colors, formatCount, radius, spacing } from '../theme';

/**
 * Meta de salario del día, en el perfil.
 *
 * Enseña las monedas que han llegado en regalos de la suerte, cuánto falta para
 * la siguiente meta y las horas de directo, que son la otra condición: sin dos
 * horas no se cobra por muchas monedas que se reúnan, y eso tiene que verse
 * antes de que acabe el día, no después.
 */
export function SalaryGoal({ progreso }: { progreso: SalaryProgress }) {
  const siguiente = progreso.siguiente;
  const meta = siguiente?.meta ?? progreso.luckyCoins;
  const avance = meta > 0 ? Math.min(1, progreso.luckyCoins / meta) : 1;
  const horas = progreso.liveSeconds / 3600;
  const horasMinimas = progreso.segundosMinimos / 3600;

  return (
    <LinearGradient
      colors={['#2A1B4D', '#12081F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.tarjeta}
    >
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Meta de hoy</Text>
        {progreso.nivel > 0 ? (
          <View style={styles.nivel}>
            <Text style={styles.nivelTexto}>Nivel {progreso.nivel}</Text>
          </View>
        ) : null}
      </View>

      {/* Lo que ha llegado en regalos de la suerte, que es lo que cuenta. */}
      <View style={styles.monedasFila}>
        <Text style={styles.moneda}>🪙</Text>
        <Text style={styles.monedas}>{progreso.luckyCoins.toLocaleString('es')}</Text>
      </View>

      <View style={styles.barra}>
        <View style={[styles.barraLlena, { width: `${avance * 100}%` }]} />
      </View>

      <Text style={styles.detalle}>
        {siguiente
          ? `Faltan ${formatCount(siguiente.meta - progreso.luckyCoins)} para el nivel ${siguiente.nivel} · 💎 ${formatCount(siguiente.salario)}`
          : 'Nivel máximo alcanzado'}
      </Text>

      <View style={styles.pie}>
        <View style={styles.pieItem}>
          <Ionicons
            name={progreso.cumpleHoras ? 'checkmark-circle' : 'time-outline'}
            size={14}
            color={progreso.cumpleHoras ? colors.success : colors.textMuted}
          />
          <Text style={[styles.pieTexto, progreso.cumpleHoras && styles.pieTextoOk]}>
            {horas.toFixed(1)} h de {horasMinimas} en directo
          </Text>
        </View>

        <Text style={styles.salario}>
          {progreso.salarioEstimado > 0
            ? `💎 ${progreso.salarioEstimado.toLocaleString('es')}`
            : progreso.nivel > 0
              ? 'Faltan horas'
              : 'Sin meta aún'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { color: colors.text, fontSize: 15, fontWeight: '800' },
  nivel: {
    backgroundColor: colors.coin,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  nivelTexto: { color: '#2A1300', fontSize: 11, fontWeight: '900' },

  monedasFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  moneda: { fontSize: 22 },
  monedas: { color: colors.coin, fontSize: 26, fontWeight: '900' },

  barra: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  barraLlena: { height: '100%', backgroundColor: colors.coin },
  detalle: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pieItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pieTexto: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  pieTextoOk: { color: colors.success },
  salario: { color: colors.diamond, fontSize: 13, fontWeight: '800' },
});
