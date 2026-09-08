import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { Chest } from '../api/types';
import { colors, formatCount, radius, spacing, typography } from '../theme';

/**
 * Lo que puede soltar cada cofre, al tocar «Detalles».
 *
 * Va sin adornos: el precio, los premios posibles y **cada cuánto premia**. Un
 * juego de azar que esconde la probabilidad se acaba notando, y lo que queda
 * después es que nadie se fía de los otros números de la app.
 */
export function ChestDetails({
  visible,
  cofres,
  onClose,
}: {
  visible: boolean;
  cofres: Chest[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.fondo} onPress={onClose} />
      <View style={[styles.hoja, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.cabecera}>
          <Text style={typography.title}>Cofres de la suerte</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.contenido}>
          {cofres.map((cofre) => (
            <LinearGradient key={cofre.code} colors={['#2A1B4D', '#12081F']} style={styles.cofre}>
              <View style={styles.titulo}>
                <Text style={styles.emoji}>{cofre.emoji}</Text>
                <View style={styles.textos}>
                  <Text style={styles.nombre}>{cofre.nombre}</Text>
                  <Text style={styles.precio}>🪙 {cofre.precio.toLocaleString('es')} cada uno</Text>
                </View>
                <Text style={styles.probabilidad}>premia el {cofre.probabilidad.toFixed(1)}%</Text>
              </View>

              {/* De mayor a menor, que es como se leen: primero el gordo. */}
              <View style={styles.premios}>
                {[...cofre.premios]
                  .sort((a, b) => b - a)
                  .map((premio) => (
                    <View key={premio} style={styles.premio}>
                      <Text style={styles.premioTexto}>🪙 {formatCount(premio)}</Text>
                    </View>
                  ))}
              </View>
            </LinearGradient>
          ))}

          <Text style={styles.seccion}>Reglas</Text>
          <Text style={styles.regla}>1. Cada cofre se sortea por separado: abrir diez son diez tiradas.</Text>
          <Text style={styles.regla}>
            2. El premio son monedas para ti, al momento y en el mismo movimiento que el cobro.
          </Text>
          <Text style={styles.regla}>
            3. La mayoría de las veces no toca nada. El premio más pequeño ya triplica lo que cuesta el cofre, y por
            eso premia pocas veces.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.overlay },
  hoja: {
    maxHeight: '80%',
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
  contenido: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },

  cofre: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 30 },
  textos: { flex: 1, gap: 1 },
  nombre: { color: colors.text, fontSize: 15, fontWeight: '800' },
  precio: { color: colors.coin, fontSize: 12, fontWeight: '700' },
  probabilidad: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },

  premios: { flexDirection: 'row', gap: spacing.xs },
  premio: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  premioTexto: { color: colors.coin, fontSize: 12, fontWeight: '800' },

  seccion: { ...typography.label, marginTop: spacing.xs },
  regla: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
