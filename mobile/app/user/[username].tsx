import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, users as usersApi } from '../../src/api';
import type { PastStream, Profile } from '../../src/api/types';
import { Avatar, Button, EmptyState, Loader } from '../../src/components/ui';
import { colors, formatCount, gradients, radius, spacing, typography } from '../../src/theme';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streams, setStreams] = useState<PastStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!username) return;
      setLoading(true);
      usersApi
        .profile(username)
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
      // El historial no bloquea el perfil: si falla, la sección simplemente no aparece.
      usersApi
        .streams(username)
        .then((data) => setStreams(data.streams))
        .catch(() => setStreams([]));
    }, [username]),
  );

  async function toggleFollow() {
    if (!profile) return;
    setBusy(true);
    try {
      const result = profile.isFollowing
        ? await usersApi.unfollow(profile.user.username)
        : await usersApi.follow(profile.user.username);
      setProfile({
        ...profile,
        isFollowing: result.following,
        stats: { ...profile.stats, followers: result.followers },
      });
    } catch (error) {
      Alert.alert('No se pudo actualizar', error instanceof ApiError ? error.message : 'Inténtalo de nuevo');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loader />;
  if (!profile) return <EmptyState title="Perfil no encontrado" />;

  const { user, stats, liveRoom } = profile;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <LinearGradient colors={[...gradients.brand]} style={styles.hero}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={80} />
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          <View style={styles.statsRow}>
            <Stat label="Seguidores" value={stats.followers} />
            <Stat label="Siguiendo" value={stats.following} />
            <Stat label="Nivel" value={user.level} />
          </View>
        </LinearGradient>

        {liveRoom ? (
          <Pressable style={styles.liveCard} onPress={() => router.push(`/room/${liveRoom.id}`)}>
            <View style={styles.liveDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.liveTitle} numberOfLines={1}>
                {liveRoom.title}
              </Text>
              <Text style={styles.liveMeta}>En vivo ahora · 👀 {liveRoom.viewerCount}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {!profile.isSelf ? (
          <Button
            label={profile.isFollowing ? 'Dejar de seguir' : 'Seguir'}
            variant={profile.isFollowing ? 'ghost' : 'primary'}
            loading={busy}
            onPress={toggleFollow}
          />
        ) : (
          <Text style={[typography.label, { textAlign: 'center' }]}>Este es tu perfil público</Text>
        )}

        {streams.length > 0 ? (
          <View style={styles.history}>
            <Text style={typography.heading}>Transmisiones anteriores</Text>
            {streams.map((stream) => (
              <View key={stream.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {stream.title}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {formatDate(stream.startedAt)} · {formatDuration(stream.durationSeconds)}
                  </Text>
                </View>
                <Text style={styles.historyStat}>👀 {formatCount(stream.peakViewers)}</Text>
                <Text style={styles.historyStat}>💎 {formatCount(stream.totalDiamonds)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue}>{value.toLocaleString('es')}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  back: { alignSelf: 'flex-start' },
  hero: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  name: { color: colors.onPrimary, fontSize: 21, fontWeight: '800' },
  username: { color: 'rgba(4,22,13,0.72)', fontSize: 13, fontWeight: '600' },
  bio: { color: 'rgba(4,22,13,0.86)', fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  statValue: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
  statLabel: { color: 'rgba(4,22,13,0.72)', fontSize: 11, fontWeight: '600' },
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.live,
    padding: spacing.lg,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.live },
  liveTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  liveMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  history: { gap: spacing.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  historyTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  historyMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  historyStat: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
});
