import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hosts as hostsApi } from '../api';
import type { RoomGoal, SalaryLevel, SalaryPayment } from '../api/types';
import { colors, formatCount, radius, spacing, typography } from '../theme';

/**
 * Las reglas del salario, al tocar la barra de la meta.
 *
 * Un anfitrión que no entiende de dónde sale el pago deja de fiarse del sistema,
 * así que aquí no se resume: se enseña la tabla entera, lo que falta de directo
 * y los días ya cobrados. Los pagos son solo para el anfitrión; quien mira desde
 * fuera ve las reglas y el progreso, que es lo que le dice cuánto falta para
 * empujar la meta.
 */
export function SalaryRules({
  visible,
  meta,
  niveles,
  esAnfitrion,
  onClose,
}: {
  visible: boolean;
  meta: RoomGoal;
  niveles: SalaryLevel[];
  esAnfitrion: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [historial, setHistorial] = useState<SalaryPayment[]>([]);

  useEffect(() => {
    if (!visible || !esAnfitrion) return;
    void hostsApi
      .salary()
      .then((data) => setHistorial(data.historial))
      .catch(() => undefined);
  }, [visible, esAnfitrion]);

  const faltan = Math.max(0, meta.segundosMinimos - meta.liveSeconds);
  const horas = Math.floor(faltan / 3600);
  const minutos = Math.floor((faltan % 3600) / 60);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose} />
      <View style={[styles.hoja, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.cabecera}>
          <Text style={typography.title}>Meta y salario</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.contenido}>
          {/* Las dos condiciones, juntas: monedas y horas. Faltar una es no cobrar. */}
          <View style={styles.resumen}>
            <View style={styles.dato}>
              <Text style={styles.datoValor}>🪙 {meta.luckyCoins.toLocaleString('es')}</Text>
              <Text style={styles.datoEtiqueta}>Recibido hoy</Text>
            </View>
            <View style={styles.dato}>
              <Text style={[styles.datoValor, meta.cumpleHoras && { color: colors.success }]}>
                {(meta.liveSeconds / 3600).toFixed(1)} h
              </Text>
              <Text style={styles.datoEtiqueta}>
                {meta.cumpleHoras
                  ? 'Mínimo cumplido'
                  : `Faltan ${horas > 0 ? `${horas} h ` : ''}${minutos} min`}
              </Text>
            </View>
          </View>

          <Text style={styles.reglas}>
            Cuenta lo que llega en regalos de la suerte, no los exclusivos. Hacen falta{' '}
            {(meta.segundosMinimos / 3600).toFixed(0)} horas de directo en el mismo día, y el día se
            cierra a medianoche de Brasilia. El salario se paga en diamantes.
          </Text>

          <Text style={styles.seccion}>Niveles</Text>
          <View style={styles.tabla}>
            {niveles.map((nivel) => {
              const conseguido = meta.luckyCoins >= nivel.meta;
              const enCurso = meta.siguiente?.nivel === nivel.nivel;
              return (
                <View
                  key={nivel.nivel}
                  style={[styles.fila, conseguido && styles.filaHecha, enCurso && styles.filaEnCurso]}
                >
                  <Text style={styles.filaNivel}>{nivel.nivel}</Text>
                  <Text style={styles.filaMeta}>🪙 {formatCount(nivel.meta)}</Text>
                  <Text style={styles.filaSalario}>💎 {formatCount(nivel.salario)}</Text>
                  {conseguido ? (
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  ) : (
                    <View style={styles.marcaHueca} />
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.reglas}>
            Pasado el último nivel se sigue cobrando: cada millón de más suma 💎 10.000.
          </Text>

          {esAnfitrion ? (
            <>
              <Text style={styles.seccion}>Pagos</Text>
              {historial.length === 0 ? (
                <Text style={styles.vacio}>Todavía no has cobrado ningún día.</Text>
              ) : (
                historial.map((pago) => (
                  <View key={pago.id} style={styles.pago}>
                    <Text style={styles.pagoDia}>{pago.day}</Text>
                    <Text style={styles.pagoNivel}>Nivel {pago.level}</Text>
                    <Text style={styles.pagoDiamantes}>💎 {pago.diamonds.toLocaleString('es')}</Text>
                  </View>
                ))
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.overlay },
  hoja: {
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  contenido: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },

  resumen: { flexDirection: 'row', gap: spacing.sm },
  dato: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  datoValor: { color: colors.coin, fontSize: 18, fontWeight: '900' },
  datoEtiqueta: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  reglas: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },

  seccion: { ...typography.label, marginTop: spacing.sm },
  tabla: { gap: 2 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  filaHecha: { backgroundColor: 'rgba(56, 239, 125, 0.12)' },
  filaEnCurso: { borderWidth: 1, borderColor: colors.coin },
  filaNivel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', width: 20 },
  filaMeta: { color: colors.text, fontSize: 12, fontWeight: '700', flex: 1 },
  filaSalario: { color: colors.diamond, fontSize: 12, fontWeight: '700' },
  marcaHueca: { width: 14 },

  vacio: { color: colors.textFaint, fontSize: 12 },
  pago: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  pagoDia: { color: colors.text, fontSize: 12, fontWeight: '700', flex: 1 },
  pagoNivel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  pagoDiamantes: { color: colors.diamond, fontSize: 12, fontWeight: '800' },
});
