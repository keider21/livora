import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import type { Room } from '../api/types';
import { colors, formatCount, radius, spacing } from '../theme';
import { Avatar, LiveBadge } from './ui';

const CATEGORY_LABELS: Record<string, string> = {
  chat: 'Charla',
  music: 'Música',
  dance: 'Baile',
  game: 'Juegos',
  talent: 'Talento',
};

export function RoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Portada de la transmisión; si no hay, la foto del anfitrión, que es
          lo que la gente reconoce. El degradado queda solo para quien no tiene
          ni una ni otra: antes salía siempre y las tarjetas parecían vacías. */}
      {room.coverUrl || room.host.avatarUrl ? (
        <Image
          source={{ uri: room.coverUrl ?? room.host.avatarUrl! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={coverGradient(room.id)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient colors={['transparent', 'rgba(5,10,7,0.92)']} style={StyleSheet.absoluteFill} />

      <View style={styles.topRow}>
        <LiveBadge viewers={room.viewerCount} />
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{CATEGORY_LABELS[room.category] ?? room.category}</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>
          {room.title}
        </Text>
        <View style={styles.hostRow}>
          <Avatar uri={room.host.avatarUrl} name={room.host.displayName} size={24} />
          <Text style={styles.hostName} numberOfLines={1}>
            {room.host.displayName}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>👀 {formatCount(room.viewerCount)}</Text>
          <Text style={styles.stat}>💎 {formatCount(room.totalDiamonds)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Degradado estable derivado del id, para que cada sala tenga su color. */
function coverGradient(seed: string): [string, string] {
  const palettes: Array<[string, string]> = [
    ['#00E676', '#A8FF3E'],
    ['#00B894', '#5EE7FF'],
    ['#0F9B6C', '#A8FF3E'],
    ['#5EE7FF', '#00E676'],
    ['#7BE82F', '#00A85A'],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length]!;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 0.78,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm },
  categoryPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  categoryText: { color: colors.text, fontSize: 10, fontWeight: '700' },
  bottom: { padding: spacing.sm, gap: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hostName: { color: colors.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
});
