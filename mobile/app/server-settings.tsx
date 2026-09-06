import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getApiUrl } from '../src/api';
import { checkServer, defaultServerUrl, normalizeServerUrl, saveServerUrl } from '../src/settings/server-url';
import { disconnectSocket } from '../src/realtime/socket';
import { useAuthStore } from '../src/store/auth-store';
import { Button, Field } from '../src/components/ui';
import { colors, radius, spacing, typography } from '../src/theme';

export default function ServerSettingsScreen() {
  const router = useRouter();
  const restore = useAuthStore((state) => state.restore);
  const [value, setValue] = useState(getApiUrl());
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalized = normalizeServerUrl(value);
  const invalid = value.trim().length > 0 && normalized === null;

  async function test() {
    if (!normalized) return;
    setTesting(true);
    setResult(await checkServer(normalized));
    setTesting(false);
  }

  async function apply(url: string | null) {
    setSaving(true);
    await saveServerUrl(url);
    // La sesión guardada pertenece al servidor anterior: se cierra el socket y
    // se vuelve a validar el token contra el nuevo. Si no vale, se va al login.
    disconnectSocket();
    await restore();
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={typography.title}>Servidor</Text>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={26} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.help}>
            La app habla con tu backend. En un teléfono físico pon la IP de tu equipo en la red local, por
            ejemplo <Text style={styles.code}>http://192.168.1.50:4000</Text>. El servidor y el teléfono deben
            estar en la misma red Wi-Fi.
          </Text>

          <Field
            label="Dirección del servidor"
            value={value}
            onChangeText={(text) => {
              setValue(text);
              setResult(null);
            }}
            placeholder="http://192.168.1.50:4000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={invalid ? 'No parece una dirección válida' : null}
          />

          {result ? (
            <View style={[styles.result, result.ok ? styles.resultOk : styles.resultBad]}>
              <Ionicons
                name={result.ok ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={result.ok ? colors.success : colors.danger}
              />
              <Text style={styles.resultText}>{result.message}</Text>
            </View>
          ) : null}

          <Button label="Probar conexión" variant="ghost" onPress={test} loading={testing} disabled={!normalized} />
          <Button label="Guardar y usar" onPress={() => apply(normalized)} loading={saving} disabled={!normalized} />
          <Button
            label={`Volver al valor por defecto (${defaultServerUrl()})`}
            variant="ghost"
            onPress={() => apply(null)}
            disabled={saving}
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
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  code: { color: colors.text, fontWeight: '700' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  resultOk: { borderColor: colors.success, backgroundColor: 'rgba(56,239,125,0.10)' },
  resultBad: { borderColor: colors.danger, backgroundColor: 'rgba(255,77,94,0.10)' },
  resultText: { flex: 1, color: colors.text, fontSize: 13 },
});
