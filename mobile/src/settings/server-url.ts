import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL, getApiUrl, setApiUrl } from '../api/client';

const STORAGE_KEY = 'livora.apiUrl';
const HEALTH_TIMEOUT_MS = 5000;

/**
 * Limpia lo que escribe el usuario: añade http:// si falta, quita barras
 * finales y rechaza lo que no tenga pinta de dirección. No usa `URL` porque la
 * implementación de React Native no expone origin ni pathname de forma fiable.
 */
export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const cleaned = withScheme.replace(/\/+$/, '');

  return /^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(cleaned) ? cleaned : null;
}

/** Se llama al arrancar, antes de restaurar la sesión, para que todo apunte al servidor guardado. */
export async function loadServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    setApiUrl(saved);
  } catch {
    setApiUrl(null);
  }
  return getApiUrl();
}

/** `null` borra el valor guardado y vuelve al de la compilación. */
export async function saveServerUrl(url: string | null): Promise<void> {
  if (url) {
    await AsyncStorage.setItem(STORAGE_KEY, url);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
  setApiUrl(url);
}

export function defaultServerUrl(): string {
  return DEFAULT_API_URL;
}

/** Pregunta a /health con un tiempo máximo, sin tocar la URL activa. */
export async function checkServer(url: string): Promise<{ ok: boolean; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/health`, { signal: controller.signal });
    if (!response.ok) return { ok: false, message: `El servidor respondió ${response.status}` };
    const data = (await response.json()) as { service?: string; time?: string };
    return { ok: true, message: `Conectado a ${data.service ?? 'la API'}` };
  } catch {
    return { ok: false, message: 'Sin respuesta. Revisa la IP, el puerto y que el servidor esté arriba.' };
  } finally {
    clearTimeout(timer);
  }
}
