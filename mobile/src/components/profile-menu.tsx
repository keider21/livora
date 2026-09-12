import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

/**
 * Los accesos del perfil, en rejilla de iconos.
 *
 * Antes era una pila de botones de ancho completo, uno debajo de otro. Con seis
 * la lista ya obligaba a desplazarse, y todos pesaban lo mismo: un botón verde
 * de «Editar perfil» ocupaba tanto como «Servidor», que se toca una vez en la
 * vida.
 *
 * En rejilla caben cuatro por fila sin desplazarse, y **el icono hace el trabajo
 * que hacía el texto**: se reconoce de un vistazo sin leer, que es como se usa un
 * menú al que se entra veinte veces al día.
 *
 * Cerrar sesión no está aquí a propósito. Es lo único de lo que no se vuelve con
 * un toque, y en una rejilla de iconos iguales se pulsa por error.
 */
export interface OpcionDePerfil {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Color del icono. Por defecto el de marca. */
  tinte?: string;
  /** Marca de aviso en la esquina, como la versión o un contador. */
  insignia?: string;
  onPress: () => void;
}

export function ProfileMenu({ opciones }: { opciones: OpcionDePerfil[] }) {
  return (
    <View style={styles.tarjeta}>
      {opciones.map((opcion) => (
        <Pressable
          key={opcion.key}
          onPress={opcion.onPress}
          style={styles.celda}
          accessibilityRole="button"
          accessibilityLabel={opcion.label}
        >
          <View style={[styles.icono, opcion.tinte ? { backgroundColor: `${opcion.tinte}22` } : null]}>
            <Ionicons name={opcion.icon} size={22} color={opcion.tinte ?? colors.primary} />
            {opcion.insignia ? (
              <View style={styles.insignia}>
                <Text style={styles.insigniaTexto} numberOfLines={1}>
                  {opcion.insignia}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.etiqueta} numberOfLines={2}>
            {opcion.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  // Cuatro por fila: con el ancho de un móvil es lo que deja el icono grande y
  // la etiqueta entera sin partirla en tres líneas.
  celda: { width: '25%', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  icono: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(0,230,118,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insignia: {
    position: 'absolute',
    top: -4,
    right: -8,
    maxWidth: 52,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  insigniaTexto: { color: colors.textMuted, fontSize: 8, fontWeight: '700' },
  etiqueta: { color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 2 },
});
