import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth-store';
import { ApiError } from '../../src/api';
import { Button, Field } from '../../src/components/ui';
import { colors, radius, spacing, typography } from '../../src/theme';

type Gender = 'female' | 'male' | 'unspecified';

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'female', label: 'Mujer' },
  { value: 'male', label: 'Hombre' },
  { value: 'unspecified', label: 'Prefiero no decirlo' },
];

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [gender, setGender] = useState<Gender>('unspecified');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const complete =
    form.displayName.length >= 2 &&
    form.username.length >= 3 &&
    form.email.includes('@') &&
    form.password.length >= 8;

  async function submit() {
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await register({ ...form, username: form.username.toLowerCase(), gender });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // El backend devuelve el detalle por campo cuando la validación falla.
        const details = err.details as Array<{ field: string; message: string }> | undefined;
        if (Array.isArray(details)) {
          setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])));
        }
      } else {
        setError('No se pudo crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: spacing.xs }}>
            <Text style={typography.title}>Crea tu cuenta</Text>
            <Text style={typography.label}>Recibes 500 monedas de bienvenida</Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Nombre visible"
              value={form.displayName}
              onChangeText={(displayName) => setForm({ ...form, displayName })}
              placeholder="Luna Ríos"
              error={fieldErrors.displayName}
            />
            <Field
              label="Usuario"
              value={form.username}
              onChangeText={(username) => setForm({ ...form, username })}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="luna"
              error={fieldErrors.username}
            />
            <Field
              label="Correo"
              value={form.email}
              onChangeText={(email) => setForm({ ...form, email })}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="luna@correo.com"
              error={fieldErrors.email}
            />
            <Field
              label="Contraseña"
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              secureTextEntry
              placeholder="Mínimo 8 caracteres"
              error={fieldErrors.password}
            />

            <View style={{ gap: spacing.sm }}>
              <Text style={typography.label}>Género</Text>
              <View style={styles.genders}>
                {GENDERS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setGender(option.value)}
                    style={[styles.gender, gender === option.value && styles.genderActive]}
                  >
                    <Text style={[styles.genderText, gender === option.value && { color: colors.onPrimary }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Crear cuenta" onPress={submit} loading={loading} disabled={!complete} />
          </View>

          <Link href="/(auth)/login" style={styles.link}>
            <Text style={styles.linkText}>Ya tengo cuenta</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  form: { gap: spacing.lg },
  genders: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  gender: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  link: { alignSelf: 'center' },
  linkText: { color: colors.secondary, fontWeight: '700' },
});
