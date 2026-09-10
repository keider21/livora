import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { SeatInfo } from '../realtime/events';
import { colors, radius, spacing } from '../theme';

/**
 * Rejilla de asientos para las salas de fiesta y de solo audio.
 *
 * En el formato normal los invitados van en una tira al lado, porque son pocos y
 * lo que manda es el vídeo del anfitrión. En fiesta y en audio son muchos más y
 * la gracia es justo esa: la sala deja de ser un escenario y pasa a ser una mesa,
 * así que los huecos ocupan el centro y se ven todos a la vez.
 *
 * **Los huecos vacíos también se pintan.** Una rejilla con dos caras y sitio de
 * sobra invita a pedir subir; una lista con solo dos avatares no dice que se
 * pueda. Por eso se dibujan hasta el aforo del formato.
 */
export function SeatGrid({
  seats,
  maxSeats,
  selectedId,
  isHost,
  onSelect,
  onRemove,
  onRequest,
  puedePedir,
}: {
  seats: SeatInfo[];
  /** Aforo del formato: 10 en fiesta, 25 en audio. */
  maxSeats: number;
  selectedId: string;
  isHost: boolean;
  onSelect: (userId: string) => void;
  onRemove: (userId: string) => void;
  /** Tocar un hueco vacío pide subir. */
  onRequest: () => void;
  puedePedir: boolean;
}) {
  const ocupados = new Map(seats.map((seat) => [seat.position, seat]));
  const huecos = Array.from({ length: maxSeats }, (_, i) => i + 1);

  return (
    <View style={styles.rejilla} pointerEvents="box-none">
      {huecos.map((posicion) => {
        const seat = ocupados.get(posicion);

        if (!seat) {
          return (
            <Pressable
              key={posicion}
              onPress={puedePedir ? onRequest : undefined}
              style={[styles.hueco, styles.vacio]}
              accessibilityLabel={puedePedir ? `Pedir el asiento ${posicion}` : `Asiento ${posicion} libre`}
            >
              <Ionicons name="add" size={16} color={colors.textFaint} />
              <Text style={styles.numero}>{posicion}</Text>
            </Pressable>
          );
        }

        const elegido = selectedId === seat.userId;
        return (
          <Pressable
            key={posicion}
            onPress={() => onSelect(seat.userId)}
            onLongPress={isHost ? () => onRemove(seat.userId) : undefined}
            style={[styles.hueco, elegido && styles.elegido]}
            accessibilityLabel={`Invitado ${seat.user.displayName}${elegido ? ', elegido para el regalo' : ''}`}
          >
            <Image
              source={{ uri: seat.user.avatarUrl ?? undefined }}
              style={styles.avatar}
              contentFit="cover"
              transition={150}
            />
            <Text style={styles.nombre} numberOfLines={1}>
              {seat.user.displayName}
            </Text>
            {seat.micMuted ? (
              <View style={styles.mudo}>
                <Ionicons name="mic-off" size={10} color={colors.text} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  hueco: {
    width: 58,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  vacio: {
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'rgba(5,10,7,0.35)',
    justifyContent: 'center',
    height: 62,
  },
  elegido: { borderColor: colors.primary, backgroundColor: 'rgba(0,230,118,0.12)' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt },
  nombre: { color: colors.text, fontSize: 9, fontWeight: '600', maxWidth: 56 },
  numero: { color: colors.textFaint, fontSize: 10, fontWeight: '700' },
  mudo: {
    position: 'absolute',
    right: 6,
    top: 4,
    backgroundColor: colors.danger,
    borderRadius: 8,
    padding: 2,
  },
});
