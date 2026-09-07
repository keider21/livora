import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { SeatInfo } from '../realtime/events';
import { colors, radius, spacing } from '../theme';

/**
 * Tira vertical de invitados sobre el vídeo.
 *
 * Los invitados suben sin cámara: en su hueco solo se ve el avatar, por eso la
 * tira va al lado y no ocupa el vídeo del anfitrión. Tocar un hueco lo elige
 * como destinatario del siguiente regalo.
 */
export function SeatStrip({
  seats,
  selectedId,
  hostId,
  isHost,
  onSelect,
  onRemove,
}: {
  seats: SeatInfo[];
  /** Quién recibirá el próximo regalo: el anfitrión o uno de la tira. */
  selectedId: string;
  hostId: string;
  isHost: boolean;
  onSelect: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  if (seats.length === 0) return null;

  return (
    <View style={styles.strip} pointerEvents="box-none">
      {seats.map((seat) => {
        const selected = selectedId === seat.userId;
        return (
          <Pressable
            key={seat.userId}
            onPress={() => onSelect(seat.userId)}
            onLongPress={isHost ? () => onRemove(seat.userId) : undefined}
            style={[styles.seat, selected && styles.seatSelected]}
            accessibilityLabel={`Invitado ${seat.user.displayName}${selected ? ', elegido para el regalo' : ''}`}
          >
            <Image
              source={{ uri: seat.user.avatarUrl ?? undefined }}
              style={styles.avatar}
              contentFit="cover"
              transition={150}
            />
            <Text style={styles.name} numberOfLines={1}>
              {seat.user.displayName}
            </Text>
            {seat.micMuted ? (
              <View style={styles.muted}>
                <Ionicons name="mic-off" size={11} color={colors.text} />
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {/* El anfitrión vuelve a ser el destinatario tocando su propio hueco. */}
      <Pressable
        onPress={() => onSelect(hostId)}
        style={[styles.seat, styles.hostSeat, selectedId === hostId && styles.seatSelected]}
        accessibilityLabel="Regalar al anfitrión"
      >
        <Ionicons name="home" size={18} color={colors.onPrimary} />
        <Text style={[styles.name, styles.hostName]} numberOfLines={1}>
          Anfitrión
        </Text>
      </Pressable>
    </View>
  );
}

const AVATAR = 42;

const styles = StyleSheet.create({
  strip: { gap: spacing.sm, alignItems: 'center' },
  seat: {
    alignItems: 'center',
    gap: 2,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(5,10,7,0.55)',
    width: AVATAR + spacing.md,
  },
  seatSelected: { borderColor: colors.primary },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.surfaceAlt },
  hostSeat: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    height: AVATAR + spacing.lg,
  },
  name: { color: colors.text, fontSize: 9, fontWeight: '700', maxWidth: AVATAR + spacing.sm },
  hostName: { color: colors.onPrimary },
  muted: {
    position: 'absolute',
    right: 2,
    top: 2,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    padding: 2,
  },
});
