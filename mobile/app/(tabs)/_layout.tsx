import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildInfo, isCiBuild } from '../../src/build-info';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radius } from '../../src/theme';

const LAST_SEEN_BUILD_KEY = 'livora.lastSeenBuild';

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Tras instalar una APK nueva, la pantalla de novedades se abre sola una
  // vez. En compilaciones locales (build 0) no hay nada que anunciar.
  useEffect(() => {
    if (!isCiBuild) return;
    const current = String(buildInfo.buildNumber);
    AsyncStorage.getItem(LAST_SEEN_BUILD_KEY)
      .then((seen) => {
        if (seen === current) return;
        return AsyncStorage.setItem(LAST_SEEN_BUILD_KEY, current).then(() => router.push('/whats-new'));
      })
      .catch(() => undefined);
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // La barra dibuja por debajo de la del sistema, así que en los
        // teléfonos con los tres botones hay que sumarle ese alto: sin esto
        // los iconos quedaban justo encima de «atrás» e «inicio». Donde la
        // navegación es por gestos el inset es 0 y no cambia nada.
        tabBarStyle: [styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: 8 + insets.bottom }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'En vivo',
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="go-live-tab"
        options={{
          title: '',
          tabBarButton: () => (
            <Pressable style={styles.liveButton} onPress={() => router.push('/go-live')}>
              <LinearGradient colors={[...gradients.brand]} style={styles.liveGradient}>
                <Ionicons name="radio" size={22} color={colors.onPrimary} />
              </LinearGradient>
              <Text style={styles.liveLabel}>Transmitir</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

/** Alto de la barra sin contar la navegación del sistema. */
const BAR_HEIGHT = 66;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  liveButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  liveGradient: {
    width: 46,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
});
