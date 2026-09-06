import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { getApiUrl, DEFAULT_API_URL } from '../../api/client';
import { checkServer, loadServerUrl, normalizeServerUrl, saveServerUrl } from '../server-url';

beforeEach(async () => {
  await AsyncStorage.clear();
  await saveServerUrl(null);
});

describe('normalizeServerUrl', () => {
  it('añade http:// cuando falta y quita barras finales', () => {
    expect(normalizeServerUrl('192.168.1.50:4000')).toBe('http://192.168.1.50:4000');
    expect(normalizeServerUrl('https://api.livora.app/')).toBe('https://api.livora.app');
    expect(normalizeServerUrl('  http://miservidor.local:4000//  ')).toBe('http://miservidor.local:4000');
  });

  it('rechaza lo que no es una dirección', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('   ')).toBeNull();
    expect(normalizeServerUrl('http://')).toBeNull();
    expect(normalizeServerUrl('no es una url con espacios')).toBeNull();
  });
});

describe('servidor guardado', () => {
  it('sin nada guardado usa el valor de la compilación', async () => {
    await expect(loadServerUrl()).resolves.toBe(DEFAULT_API_URL);
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
  });

  it('guardar cambia la URL activa y sobrevive a un reinicio', async () => {
    await saveServerUrl('http://10.0.0.7:4000');
    expect(getApiUrl()).toBe('http://10.0.0.7:4000');

    // Simula reinicio: la URL en memoria se pierde, la guardada se recupera.
    await saveServerUrl(null);
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
    await AsyncStorage.setItem('livora.apiUrl', 'http://10.0.0.7:4000');
    await expect(loadServerUrl()).resolves.toBe('http://10.0.0.7:4000');
  });

  it('guardar null borra el valor y vuelve al de la compilación', async () => {
    await saveServerUrl('http://10.0.0.7:4000');
    await saveServerUrl(null);
    expect(await AsyncStorage.getItem('livora.apiUrl')).toBeNull();
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
  });
});

describe('checkServer', () => {
  it('informa del servicio cuando /health responde', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', service: 'livora-api' }),
    })) as unknown as typeof fetch;

    await expect(checkServer('http://10.0.0.7:4000')).resolves.toEqual({ ok: true, message: 'Conectado a livora-api' });
    expect(fetch).toHaveBeenCalledWith('http://10.0.0.7:4000/health', expect.anything());
  });

  it('explica el fallo cuando no hay respuesta', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    const result = await checkServer('http://10.0.0.7:4000');
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Sin respuesta/);
  });
});
