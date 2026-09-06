import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rooms as roomsApi, ApiError } from '../../src/api';
import type { Room } from '../../src/api/types';
import { RoomCard } from '../../src/components/room-card';
import { EmptyState, Loader } from '../../src/components/ui';
import { LogoMark } from '../../src/components/logo';
import { useAuthStore } from '../../src/store/auth-store';
import { colors, radius, spacing, typography } from '../../src/theme';

const CATEGORIES = [
  { value: undefined, label: 'Todo' },
  { value: 'chat', label: 'Charla' },
  { value: 'music', label: 'Música' },
  { value: 'dance', label: 'Baile' },
  { value: 'game', label: 'Juegos' },
  { value: 'talent', label: 'Talento' },
] as const;

export default function LiveFeedScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selected: string | undefined) => {
      setError(null);
      try {
        const data = await roomsApi.list({ category: selected, status: 'live', limit: 30 });
        setRooms(data.rooms);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las transmisiones');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Al volver de una sala el listado se refresca solo, así los contadores de
  // espectadores no quedan desactualizados.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load(category);
    }, [category, load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <LogoMark size={38} />
          <View>
            <Text style={typography.title}>Livora Stream</Text>
            <Text style={typography.label}>Hola, {user?.displayName ?? 'invitado'} 👋</Text>
          </View>
        </View>
        <Pressable style={styles.wallet} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.coins}>🪙 {(user?.coins ?? 0).toLocaleString('es')}</Text>
          <Text style={styles.diamonds}>💎 {(user?.diamonds ?? 0).toLocaleString('es')}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        style={styles.categoriesWrap}
      >
        {CATEGORIES.map((item) => {
          const active = category === item.value;
          return (
            <Pressable
              key={item.label}
              onPress={() => setCategory(item.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && { color: colors.onPrimary }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <Loader label="Buscando transmisiones…" />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={() => {
                setRefreshing(true);
                void load(category);
              }}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={error ?? 'No hay nadie en vivo'}
              subtitle={error ? 'Revisa que el servidor esté arriba.' : 'Sé el primero: pulsa Transmitir.'}
            />
          }
          renderItem={({ item }) => (
            <RoomCard room={item} onPress={() => router.push(`/room/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wallet: { alignItems: 'flex-end', gap: 2 },
  coins: { color: colors.coin, fontWeight: '700', fontSize: 13 },
  diamonds: { color: colors.diamond, fontWeight: '700', fontSize: 13 },
  categoriesWrap: { flexGrow: 0, marginTop: spacing.md },
  categories: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});
