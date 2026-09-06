import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { auth as authApi, setAuthToken } from '../api';
import type { CurrentUser } from '../api/types';
import { connectSocket, disconnectSocket, getSocket } from '../realtime/socket';
import { SOCKET_EVENTS } from '../realtime/events';

const TOKEN_KEY = 'livora.token';

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  error: string | null;

  restore: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    gender?: 'male' | 'female' | 'unspecified';
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setWallet: (wallet: { coins: number; diamonds: number }) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  status: 'loading',
  error: null,

  /** Recupera la sesión guardada al abrir la app. */
  async restore() {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ status: 'anonymous' });
      return;
    }

    setAuthToken(token);
    try {
      const { user } = await authApi.me();
      set({ token, user, status: 'authenticated' });
      openSocket(token, set);
    } catch {
      // Token caducado o revocado: se limpia y se vuelve al login.
      await AsyncStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      set({ token: null, user: null, status: 'anonymous' });
    }
  },

  async login(identifier, password) {
    set({ error: null });
    const { token, user } = await authApi.login({ identifier, password });
    await persist(token);
    set({ token, user, status: 'authenticated' });
    openSocket(token, set);
  },

  async register(input) {
    set({ error: null });
    const { token, user } = await authApi.register(input);
    await persist(token);
    set({ token, user, status: 'authenticated' });
    openSocket(token, set);
  },

  async logout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    disconnectSocket();
    set({ token: null, user: null, status: 'anonymous' });
  },

  async refresh() {
    if (!get().token) return;
    const { user } = await authApi.me();
    set({ user });
  },

  setWallet(wallet) {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, ...wallet } });
  },
}));

async function persist(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  setAuthToken(token);
}

/**
 * Abre el socket y mantiene el monedero sincronizado: cuando el servidor
 * confirma un regalo, el saldo de la cabecera cambia sin recargar nada.
 */
function openSocket(token: string, set: (partial: Partial<AuthState>) => void) {
  const socket = connectSocket(token);
  socket.off(SOCKET_EVENTS.WALLET_UPDATED);
  socket.on(SOCKET_EVENTS.WALLET_UPDATED, (wallet: { coins: number; diamonds: number }) => {
    const current = useAuthStore.getState().user;
    if (current) set({ user: { ...current, ...wallet } });
  });
}

export function currentSocket() {
  return getSocket();
}
