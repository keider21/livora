import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LATEST_APK_URL, RELEASES_URL, buildInfo, isCiBuild, versionLabel } from '../src/build-info';
import { Button, Card } from '../src/components/ui';
import { LogoMark } from '../src/components/logo';
import { colors, radius, spacing, typography } from '../src/theme';

export default function WhatsNewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={typography.title}>Novedades</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={26} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.versionRow}>
          <LogoMark size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.version}>{versionLabel()}</Text>
            <Text style={styles.meta}>
              {isCiBuild
                ? `commit ${buildInfo.commit} · ${buildInfo.branch}${buildInfo.builtAt ? ` · ${formatDate(buildInfo.builtAt)}` : ''}`
                : 'Compilación local: sin número de build ni lista de cambios'}
            </Text>
          </View>
        </View>

        <Card style={{ gap: spacing.sm }}>
          <Text style={typography.heading}>Qué cambió</Text>
          {buildInfo.changes.length === 0 ? (
            <Text style={styles.empty}>
              La lista se rellena en cada APK publicada desde GitHub con los últimos cambios del proyecto.
            </Text>
          ) : (
            buildInfo.changes.map((change, index) => (
              <View key={`${index}-${change}`} style={styles.changeRow}>
                <View style={styles.bullet} />
                <Text style={styles.change}>{change}</Text>
              </View>
            ))
          )}
        </Card>

        <Button label="Descargar la última APK" onPress={() => void Linking.openURL(LATEST_APK_URL)} />
        <Button label="Ver todas las versiones" variant="ghost" onPress={() => void Linking.openURL(RELEASES_URL)} />

        <Text style={styles.note}>
          El repositorio es privado: el navegador del teléfono debe tener la sesión de GitHub iniciada para
          descargar. Al instalar una versión nueva encima, los datos de la app se conservan.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  version: { color: colors.text, fontWeight: '800', fontSize: 17 },
  meta: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  changeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  change: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  note: { color: colors.textFaint, fontSize: 12, lineHeight: 17, textAlign: 'center', borderRadius: radius.md },
});
