import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, rooms as roomsApi } from '../src/api';
import { Button, Field } from '../src/components/ui';
import { colors, radius, spacing, typography } from '../src/theme';

const CATEGORIES = [
  { value: 'chat', label: 'Charla', icon: 'chatbubbles' },
  { value: 'music', label: 'Música', icon: 'musical-notes' },
  { value: 'dance', label: 'Baile', icon: 'body' },
  { value: 'game', label: 'Juegos', icon: 'game-controller' },
  { value: 'talent', label: 'Talento', icon: 'sparkles' },
] as const;

export default function GoLiveScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('chat');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const { room } = await roomsApi.create({ title: title.trim(), category });
      router.replace(`/room/${room.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar la transmisión');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={typography.title}>Iniciar transmisión</Text>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={26} color={colors.textMuted} />
            </Pressable>
          </View>

          <Field
            label="Título"
            value={title}
            onChangeText={setTitle}
            placeholder="Noche acústica 🎤"
            maxLength={60}
          />

          <View style={{ gap: spacing.sm }}>
            <Text style={typography.label}>Categoría</Text>
            <View style={styles.categories}>
              {CATEGORIES.map((item) => {
                const active = category === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setCategory(item.value)}
                    style={[styles.category, active && styles.categoryActive]}
                  >
                    <Ionicons name={item.icon} size={18} color={active ? colors.onPrimary : colors.textMuted} />
                    <Text style={[styles.categoryText, active && { color: colors.onPrimary }]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle" size={18} color={colors.secondary} />
            <Text style={styles.noticeText}>
              El vídeo usa el proveedor simulado. Al conectar Agora o LiveKit la cámara real ocupará este mismo
              lugar sin cambiar la pantalla.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Salir en vivo"
            onPress={start}
            loading={loading}
            disabled={title.trim().length < 3}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  noticeText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, fontWeight: '600', fontSize: 13 },
});
