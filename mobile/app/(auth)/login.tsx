import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth-store';
import { ApiError } from '../../src/api';
import { Button, Field } from '../../src/components/ui';
import { LogoMark } from '../../src/components/logo';
import { getApiUrl } from '../../src/api';
import { versionLabel } from '../../src/build-info';
import { colors, spacing, typography } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable
          onPress={() => router.push('/server-settings')}
          style={styles.settingsButton}
          hitSlop={10}
          accessibilityLabel="Ajustes del servidor"
        >
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <LogoMark size={84} />
          </View>

          <View style={styles.intro}>
            <Text style={typography.title}>Livora Stream</Text>
            <Text style={typography.label}>Entra, transmite y conecta en directo</Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Correo o usuario"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="luna"
              textContentType="username"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              textContentType="password"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Entrar" onPress={submit} loading={loading} disabled={!identifier || !password} />
          </View>

          <Link href="/(auth)/register" style={styles.link}>
            <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
          </Link>

          <Text style={styles.hint}>
            Datos de prueba del seed: usuario <Text style={styles.hintStrong}>luna</Text> · contraseña{' '}
            <Text style={styles.hintStrong}>livora123</Text>
          </Text>

          <Text style={styles.version}>
            {versionLabel()} · servidor {getApiUrl().replace(/^https?:\/\//, '')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  logo: { alignSelf: 'center' },
  intro: { alignItems: 'center', gap: spacing.xs },
  form: { gap: spacing.lg },
  error: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  link: { alignSelf: 'center' },
  linkText: { color: colors.secondary, fontWeight: '700' },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
  version: { color: colors.textFaint, fontSize: 11, textAlign: 'center' },
  settingsButton: { position: 'absolute', top: spacing.md, right: spacing.lg, zIndex: 1, padding: spacing.xs },
  hintStrong: { color: colors.textMuted, fontWeight: '700' },
});
