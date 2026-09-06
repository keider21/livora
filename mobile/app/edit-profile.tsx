import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, users as usersApi } from '../src/api';
import { useAuthStore } from '../src/store/auth-store';
import { Avatar, Button, Field } from '../src/components/ui';
import { colors, spacing, typography } from '../src/theme';

const BIO_MAX = 160;

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const refresh = useAuthStore((state) => state.refresh);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [country, setCountry] = useState(user?.country ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const trimmedName = displayName.trim();
  const trimmedCountry = country.trim().toUpperCase();
  const trimmedAvatar = avatarUrl.trim();

  // Solo viaja lo que cambió: así un PATCH parcial no pisa campos con lo mismo
  // que ya tenían, y el servidor valida únicamente lo que el usuario tocó.
  const changes: Parameters<typeof usersApi.updateProfile>[0] = {};
  if (trimmedName !== user.displayName) changes.displayName = trimmedName;
  if (bio !== (user.bio ?? '')) changes.bio = bio;
  if (trimmedCountry !== (user.country ?? '') && trimmedCountry.length > 0) changes.country = trimmedCountry;
  if (trimmedAvatar !== (user.avatarUrl ?? '') && trimmedAvatar.length > 0) changes.avatarUrl = trimmedAvatar;

  const dirty = Object.keys(changes).length > 0;
  const valid = trimmedName.length >= 2 && bio.length <= BIO_MAX && (trimmedCountry.length === 0 || trimmedCountry.length === 2);

  async function save() {
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      await usersApi.updateProfile(changes);
      await refresh();
      router.back();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        const details = err.details as Array<{ field: string; message: string }> | undefined;
        if (Array.isArray(details)) {
          setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])));
        }
      } else {
        setError('No se pudo guardar el perfil');
      }
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={typography.title}>Editar perfil</Text>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={26} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.avatarRow}>
            <Avatar uri={trimmedAvatar || null} name={trimmedName || user.displayName} size={72} ring />
            <Text style={styles.avatarHint}>
              La foto se cambia por URL hasta que exista subida desde el móvil (Fase 8.3 del plan).
            </Text>
          </View>

          <Field
            label="Nombre visible"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Cómo te verán en las salas"
            maxLength={32}
            error={fieldErrors.displayName ?? (trimmedName.length > 0 && trimmedName.length < 2 ? 'Mínimo 2 caracteres' : null)}
          />

          <View>
            <Field
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Cuéntale a la gente qué haces en directo"
              multiline
              numberOfLines={3}
              maxLength={BIO_MAX}
              style={styles.bio}
              error={fieldErrors.bio}
            />
            <Text style={[styles.counter, bio.length >= BIO_MAX && { color: colors.danger }]}>
              {bio.length}/{BIO_MAX}
            </Text>
          </View>

          <Field
            label="País (código de 2 letras)"
            value={country}
            onChangeText={(value) => setCountry(value.replace(/[^a-zA-Z]/g, '').slice(0, 2))}
            placeholder="CO"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={2}
            error={fieldErrors.country ?? (trimmedCountry.length === 1 ? 'Usa el código ISO de 2 letras' : null)}
          />

          <Field
            label="URL de la foto"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={fieldErrors.avatarUrl}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={dirty ? 'Guardar cambios' : 'Sin cambios'}
            onPress={save}
            loading={saving}
            disabled={!dirty || !valid}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatarHint: { flex: 1, color: colors.textFaint, fontSize: 12, lineHeight: 17 },
  bio: { minHeight: 84, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', color: colors.textFaint, fontSize: 11, fontWeight: '600', marginTop: spacing.xs },
  error: { color: colors.danger, fontWeight: '600', fontSize: 13 },
});
