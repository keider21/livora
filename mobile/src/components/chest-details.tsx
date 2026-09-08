import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { Gift } from '../api/types';
import { giftArt } from './gift-art';
import { colors, formatCount, radius, spacing, typography } from '../theme';

/**
 * Escalones de cada cofre, al tocar «Detalles».
 *
 * Los cofres son regalos: se envían a alguien y siempre explotan, y lo que sale
 * se lo queda quien lo recibe. Aquí se enseña la escalera entera y cada cuánto
 * cae cada escalón, sin adornos: un juego de azar que esconde la probabilidad se
 * acaba notando, y lo que queda después es que nadie se fía de los otros
 * números de la app.
 */
export function ChestDetails({
  visible,
  cofres,
  onClose,
}: {
  visible: boolean;
  cofres: Gift[];
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
          {cofres.map((cofre) => {
            const escalones = escalonesDe(cofre);
            return (
              <LinearGradient key={cofre.code} colors={['#2A1B4D', '#12081F']} style={styles.cofre}>
                <View style={styles.titulo}>
                  {giftArt(cofre.image) ? (
                    <Image source={giftArt(cofre.image)!} style={styles.arte} contentFit="contain" />
                  ) : (
                    <Text style={styles.emoji}>{cofre.emoji}</Text>
                  )}
                  <View style={styles.textos}>
                    <Text style={styles.nombre}>{cofre.name}</Text>
                    <Text style={styles.precio}>🪙 {cofre.priceCoins.toLocaleString('es')} cada uno</Text>
                  </View>
                </View>

                {/* De mayor a menor, que es como se leen: primero el gordo. */}
                <View style={styles.premios}>
                  {escalones.map((escalon) => (
                    <View key={escalon.multiplicador} style={styles.premio}>
                      <Text style={styles.premioTexto}>{formatCount(escalon.monedas)}</Text>
                      <Text style={styles.premioProbabilidad}>{formatoProbabilidad(escalon.probabilidad)}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            );
          })}

          <Text style={styles.seccion}>Reglas</Text>
          <Text style={styles.regla}>1. El cofre siempre explota: no existe la tirada vacía.</Text>
          <Text style={styles.regla}>
            2. Lo que salga no vuelve a ti: se lo lleva la persona a la que se lo mandas, como un
            regalo de ese tamaño. Cuenta para su meta y le deja el 5% en diamantes.
          </Text>
          <Text style={styles.regla}>
            3. Cada cofre se sortea por separado: mandar diez son diez tiradas, no una multiplicada.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Convierte la lista de multiplicadores del servidor (`"3:120000,5:60000"`) en
 * monedas y probabilidad, que es como se lee de un vistazo. Los pesos son
 * relativos, así que la probabilidad sale de dividir entre la suma.
 */
function escalonesDe(cofre: Gift) {
  const partes = cofre.luckyMultipliers
    .split(',')
    .map((parte) => parte.split(':').map((valor) => Number(valor.trim())))
    .filter(([multiplicador, peso]) => Number.isFinite(multiplicador) && Number.isFinite(peso));

  const total = partes.reduce((suma, [, peso]) => suma + (peso ?? 0), 0) || 1;

  return partes
    .map(([multiplicador, peso]) => ({
      multiplicador: multiplicador!,
      monedas: cofre.priceCoins * multiplicador!,
      probabilidad: ((peso ?? 0) / total) * 100,
    }))
    .sort((a, b) => b.monedas - a.monedas);
}

/** Los escalones gordos caen una vez entre miles: sin decimales se leen «0%». */
function formatoProbabilidad(valor: number): string {
  if (valor >= 1) return `${valor.toFixed(1).replace('.', ',')}%`;
  if (valor >= 0.01) return `${valor.toFixed(2).replace('.', ',')}%`;
  return `${valor.toFixed(4).replace('.', ',')}%`;
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.overlay },
  hoja: {
    maxHeight: '82%',
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
  arte: { width: 40, height: 40 },
  emoji: { fontSize: 30 },
  textos: { flex: 1, gap: 1 },
  nombre: { color: colors.text, fontSize: 15, fontWeight: '800' },
  precio: { color: colors.coin, fontSize: 12, fontWeight: '700' },

  premios: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  premio: {
    minWidth: 68,
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingVertical: 6,
  },
  premioTexto: { color: colors.coin, fontSize: 12, fontWeight: '800' },
  premioProbabilidad: { color: colors.textMuted, fontSize: 9, fontWeight: '600' },

  seccion: { ...typography.label, marginTop: spacing.xs },
  regla: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
