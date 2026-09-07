import { Platform } from 'react-native';

const FALLBACK_URL = 'http://localhost:4000';

/**
 * En el emulador de Android `localhost` apunta al propio emulador, por eso se
 * traduce a la puerta de enlace 10.0.2.2. En un teléfono físico hay que usar
 * la IP del equipo, que se configura desde la pantalla «Servidor».
 */
export function adaptForPlatform(url: string): string {
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
}

/** URL que trae la compilación (EXPO_PUBLIC_API_URL). Se puede cambiar en la app. */
export const DEFAULT_API_URL = adaptForPlatform(process.env.EXPO_PUBLIC_API_URL?.trim() || FALLBACK_URL);

let apiUrl = DEFAULT_API_URL;

export function getApiUrl(): string {
  return apiUrl;
}

/** `null` vuelve al valor de la compilación. */
export function setApiUrl(url: string | null): void {
  apiUrl = url ? adaptForPlatform(url) : DEFAULT_API_URL;
}

/**
 * Tiempo máximo por petición. Sin él, una dirección de servidor equivocada deja
 * la pantalla cargando para siempre: `fetch` en React Native no se rinde solo.
 */
const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Quien llama puede cancelar por su cuenta (al desmontar una pantalla, por
  // ejemplo); su señal se suma a la del tiempo límite.
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener('abort', forwardAbort);

  const response = await fetch(`${getApiUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: controller.signal,
  })
    .catch(() => {
      if (options.signal?.aborted) {
        throw new ApiError(0, 'aborted', 'Petición cancelada');
      }
      throw new ApiError(
        0,
        'network_error',
        'No se pudo conectar con el servidor. Revisa la dirección en la pantalla Servidor.',
      );
    })
    .finally(() => {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', forwardAbort);
    });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'error',
      error?.message ?? 'Ocurrió un error inesperado',
      error?.details,
    );
  }

  return data as T;
}
