import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Las fábricas de jest.mock se ejecutan antes que cualquier `const` del archivo
// (Jest las hoista), así que los dobles se crean dentro y se recuperan luego
// importando los módulos ya sustituidos.
jest.mock('../../realtime/socket', () => {
  const socket = { on: jest.fn(), off: jest.fn() };
  return {
    connectSocket: jest.fn(() => socket),
    disconnectSocket: jest.fn(),
    getSocket: jest.fn(() => socket),
  };
});

jest.mock('../../api', () => ({
  auth: { login: jest.fn(), register: jest.fn(), me: jest.fn() },
  setAuthToken: jest.fn(),
}));

import { useAuthStore } from '../auth-store';
import { auth as authApi, setAuthToken } from '../../api';
import { connectSocket, disconnectSocket, getSocket } from '../../realtime/socket';

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockSetAuthToken = setAuthToken as jest.MockedFunction<typeof setAuthToken>;
const mockSocket = getSocket() as unknown as { on: jest.Mock; off: jest.Mock };

const user = {
  id: 'u1',
  username: 'luna',
  displayName: 'Luna',
  avatarUrl: null,
  bio: null,
  country: 'CO',
  gender: 'female',
  level: 1,
  xp: 0,
  isHost: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  email: 'luna@test.local',
  coins: 500,
  diamonds: 0,
  currentLevelXp: 0,
  nextLevelXp: 100,
  progress: 0,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useAuthStore.setState({ token: null, user: null, status: 'loading', error: null });
});

describe('restore', () => {
  it('sin token guardado queda anónimo', async () => {
    await useAuthStore.getState().restore();
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(mockAuthApi.me).not.toHaveBeenCalled();
  });

  it('con token válido recupera el usuario y abre el socket', async () => {
    await AsyncStorage.setItem('livora.token', 'tok');
    mockAuthApi.me.mockResolvedValue({ user });

    await useAuthStore.getState().restore();

    const state = useAuthStore.getState();
    expect(state.status).toBe('authenticated');
    expect(state.user?.username).toBe('luna');
    expect(mockSetAuthToken).toHaveBeenCalledWith('tok');
    expect(connectSocket).toHaveBeenCalledWith('tok');
  });

  it('con token caducado limpia la sesión y queda anónimo', async () => {
    await AsyncStorage.setItem('livora.token', 'viejo');
    mockAuthApi.me.mockRejectedValue(new Error('401'));

    await useAuthStore.getState().restore();

    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(await AsyncStorage.getItem('livora.token')).toBeNull();
    expect(mockSetAuthToken).toHaveBeenLastCalledWith(null);
  });
});

describe('login y logout', () => {
  it('login guarda el token, fija el usuario y conecta el socket', async () => {
    mockAuthApi.login.mockResolvedValue({ token: 'nuevo', user });

    await useAuthStore.getState().login('luna', 'livora123');

    expect(mockAuthApi.login).toHaveBeenCalledWith({ identifier: 'luna', password: 'livora123' });
    expect(await AsyncStorage.getItem('livora.token')).toBe('nuevo');
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(connectSocket).toHaveBeenCalledWith('nuevo');
  });

  it('logout borra el token, cierra el socket y vuelve a anónimo', async () => {
    mockAuthApi.login.mockResolvedValue({ token: 'nuevo', user });
    await useAuthStore.getState().login('luna', 'livora123');

    await useAuthStore.getState().logout();

    expect(await AsyncStorage.getItem('livora.token')).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null, status: 'anonymous' });
    expect(disconnectSocket).toHaveBeenCalled();
  });
});

describe('monedero', () => {
  it('setWallet actualiza solo monedas y diamantes del usuario', () => {
    useAuthStore.setState({ user, status: 'authenticated', token: 't' });

    useAuthStore.getState().setWallet({ coins: 470, diamonds: 15 });

    expect(useAuthStore.getState().user).toMatchObject({ username: 'luna', coins: 470, diamonds: 15 });
  });

  it('el evento wallet:updated del socket actualiza el saldo', async () => {
    mockAuthApi.login.mockResolvedValue({ token: 'nuevo', user });
    await useAuthStore.getState().login('luna', 'livora123');

    const handler = mockSocket.on.mock.calls.find(([event]) => event === 'wallet:updated')?.[1] as
      | ((wallet: { coins: number; diamonds: number }) => void)
      | undefined;
    expect(handler).toBeDefined();

    handler!({ coins: 1, diamonds: 2 });

    expect(useAuthStore.getState().user).toMatchObject({ coins: 1, diamonds: 2 });
  });
});
