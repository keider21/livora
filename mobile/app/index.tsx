import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth-store';

export default function Index() {
  const status = useAuthStore((state) => state.status);
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}
