import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { users as usersApi, rooms as roomsApi } from '../../src/api';
import type { PublicUser, Room } from '../../src/api/types';
import { Avatar, EmptyState } from '../../src/components/ui';
import { colors, formatCount, radius, spacing, typography } from '../../src/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [trending, setTrending] = useState<Room[]>([]);

  useEffect(() => {
    roomsApi
      .list({ status: 'live', limit: 10 })
      .then((data) => setTrending(data.rooms))
      .catch(() => setTrending([]));
  }, []);

  // Búsqueda con freno: solo se consulta 350 ms después de dejar de teclear.
  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      usersApi
        .search(query)
        .then((data) => setResults(data.users))
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

  const showingSearch = term.trim().length >= 2;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.title}>Explorar</Text>
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Buscar personas…"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          style={styles.search}
        />
      </View>

      {showingSearch ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="Sin resultados" subtitle={`Nadie coincide con “${term}”`} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/user/${item.username}`)}>
              <Avatar uri={item.avatarUrl} name={item.displayName} size={44} ring={item.isHost} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.username}>@{item.username} · nivel {item.level}</Text>
              </View>
              {item.isHost ? <Text style={styles.hostTag}>anfitrión</Text> : null}
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={trending}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={[typography.heading, styles.sectionTitle]}>Tendencias ahora</Text>}
          ListEmptyComponent={<EmptyState title="Todo tranquilo" subtitle="Aún no hay transmisiones activas." />}
          renderItem={({ item, index }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/room/${item.id}`)}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Avatar uri={item.host.avatarUrl} name={item.host.displayName} size={44} ring />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.username}>
                  {item.host.displayName} · 👀 {formatCount(item.viewerCount)}
                </Text>
              </View>
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
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { marginBottom: spacing.sm },
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
  rank: { color: colors.accent, fontWeight: '800', width: 20, textAlign: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  username: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  hostTag: { color: colors.primary, fontSize: 11, fontWeight: '700' },
});
