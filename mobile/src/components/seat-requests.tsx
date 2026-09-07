import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SeatInfo } from '../realtime/events';
import { Avatar } from './ui';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Solicitudes para subir a la tira. Solo la ve el anfitrión: el servidor manda
 * la lista de pendientes únicamente a su socket.
 */
export function SeatRequests({
  visible,
  pending,
  seats,
  onClose,
  onAccept,
  onReject,
  onRemove,
}: {
  visible: boolean;
  pending: SeatInfo[];
  seats: SeatInfo[];
  onClose: () => void;
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={typography.heading}>Invitados</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            <Text style={styles.section}>Piden subir ({pending.length})</Text>
            {pending.length === 0 ? (
              <Text style={styles.empty}>Nadie ha pedido subir todavía.</Text>
            ) : (
              pending.map((seat) => (
                <View key={seat.userId} style={styles.row}>
                  <Avatar uri={seat.user.avatarUrl} name={seat.user.displayName} size={38} />
                  <Text style={styles.name} numberOfLines={1}>
                    {seat.user.displayName}
                  </Text>
                  <Pressable
                    onPress={() => onReject(seat.userId)}
                    style={[styles.action, styles.reject]}
                    accessibilityLabel={`Rechazar a ${seat.user.displayName}`}
                  >
                    <Ionicons name="close" size={18} color={colors.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => onAccept(seat.userId)}
                    style={[styles.action, styles.accept]}
                    accessibilityLabel={`Subir a ${seat.user.displayName}`}
                  >
                    <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                  </Pressable>
                </View>
              ))
            )}

            <Text style={styles.section}>Arriba ahora ({seats.length})</Text>
            {seats.length === 0 ? (
              <Text style={styles.empty}>No hay nadie en la tira.</Text>
            ) : (
              seats.map((seat) => (
                <View key={seat.userId} style={styles.row}>
                  <Avatar uri={seat.user.avatarUrl} name={seat.user.displayName} size={38} />
                  <Text style={styles.name} numberOfLines={1}>
                    {seat.user.displayName}
                  </Text>
                  <Pressable
                    onPress={() => onRemove(seat.userId)}
                    style={[styles.action, styles.reject]}
                    accessibilityLabel={`Bajar a ${seat.user.displayName}`}
                  >
                    <Ionicons name="arrow-down" size={18} color={colors.text} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  section: { ...typography.label, marginTop: spacing.sm },
  empty: { color: colors.textFaint, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  name: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 },
  action: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  accept: { backgroundColor: colors.primary },
  reject: { backgroundColor: colors.border },
});
