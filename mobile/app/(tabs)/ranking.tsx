import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ranking as rankingApi } from '../../src/api';
import type { RankingEntry } from '../../src/api/types';
import { Avatar, EmptyState, Loader } from '../../src/components/ui';
import { colors, formatCount, radius, spacing, typography } from '../../src/theme';

type Board = 'hosts' | 'senders';
type Period = 'day' | 'week' | 'all';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'all', label: 'Histórico' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingScreen() {
  const router = useRouter();
  const [board, setBoard] = useState<Board>('hosts');
  const [period, setPeriod] = useState<Period>('week');
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = board === 'hosts' ? await rankingApi.hosts(period) : await rankingApi.senders(period);
      setEntries(data.entries);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [board, period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.title}>Ranking</Text>

        <View style={styles.segmented}>
          {(['hosts', 'senders'] as Board[]).map((value) => (
            <Pressable
              key={value}
              onPress={() => setBoard(value)}
              style={[styles.segment, board === value && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, board === value && { color: colors.onPrimary }]}>
                {value === 'hosts' ? 'Anfitriones' : 'Fans'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.periods}>
          {PERIODS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setPeriod(item.value)}
              style={[styles.chip, period === item.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, period === item.value && { color: colors.onPrimary }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="Todavía sin datos" subtitle="Envía o recibe regalos para aparecer aquí." />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/user/${item.user.username}`)}>
              <Text style={styles.rank}>{MEDALS[item.rank - 1] ?? item.rank}</Text>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={44} ring={item.rank <= 3} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.user.displayName}</Text>
                <Text style={styles.username}>@{item.user.username}</Text>
              </View>
              <Text style={board === 'hosts' ? styles.diamonds : styles.coins}>
                {board === 'hosts' ? '💎' : '🪙'} {formatCount(item.score)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  periods: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rank: { width: 28, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.textMuted },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  username: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  diamonds: { color: colors.diamond, fontWeight: '800' },
  coins: { color: colors.coin, fontWeight: '800' },
});
