import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useAuthStore } from '../src/store/auth-store';
import { loadServerUrl } from '../src/settings/server-url';
import { colors } from '../src/theme';
import { Loader } from '../src/components/ui';

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);
  const restore = useAuthStore((state) => state.restore);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // El servidor guardado tiene que estar activo antes de validar el token.
    void loadServerUrl().then(() => restore());
  }, [restore]);

  // Guardia de navegación: mientras no haya sesión solo se puede estar en (auth)
  // o en los ajustes del servidor, a los que se llega desde la propia pantalla
  // de login y que hacen falta justo cuando todavía no se puede entrar. Se mira
  // la ruta entera y no solo su primer tramo: según desde dónde se abra, el
  // modal puede quedar anidado y con `segments[0]` se colaba la expulsión.
  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments.includes('(auth)');
    const inServerSettings = segments.includes('server-settings');
    if (status === 'anonymous' && !inAuthGroup && !inServerSettings) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {status === 'loading' ? (
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Loader label="Cargando Livora Stream…" />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="room/[id]" options={{ animation: 'fade' }} />
            <Stack.Screen name="go-live" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="agency" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="audit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="server-settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="whats-new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="user/[username]" />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
