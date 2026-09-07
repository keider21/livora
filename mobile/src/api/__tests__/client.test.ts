import { ApiError, apiRequest, setAuthToken } from '../client';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit]>;

function mockResponse(status: number, body: unknown = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setAuthToken(null);
});

describe('apiRequest', () => {
  it('llama a la ruta con JSON y sin cabecera de autorización si no hay sesión', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, { ok: true }));

    const data = await apiRequest<{ ok: boolean }>('/api/rooms');

    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/api\/rooms$/);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('añade el token como Bearer y serializa el cuerpo', async () => {
    fetchMock.mockResolvedValue(mockResponse(201, { id: '1' }));
    setAuthToken('token-123');

    await apiRequest('/api/rooms', { method: 'POST', body: { title: 'Hola' } });

    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
    expect(init.body).toBe(JSON.stringify({ title: 'Hola' }));
  });

  it('convierte un error de la API en ApiError con código, mensaje y detalles', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(400, {
        error: { code: 'bad_request', message: 'Datos inválidos', details: [{ field: 'country', message: 'x' }] },
      }),
    );

    await expect(apiRequest('/api/users/me', { method: 'PATCH', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'bad_request',
      message: 'Datos inválidos',
      details: [{ field: 'country', message: 'x' }],
    });
  });

  it('un fallo de red se convierte en ApiError con estado 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const error = await apiRequest('/health').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).code).toBe('network_error');
  });

  it('una respuesta sin cuerpo devuelve null', async () => {
    fetchMock.mockResolvedValue(mockResponse(204));
    await expect(apiRequest('/api/rooms/1/leave', { method: 'POST' })).resolves.toBeNull();
  });

  it('se rinde si el servidor no contesta, en vez de esperar para siempre', async () => {
    jest.useFakeTimers();
    // Un servidor inalcanzable: `fetch` no resuelve nunca y solo termina cuando
    // se aborta la señal que se le pasó.
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = apiRequest('/api/auth/register', { method: 'POST', body: {} }).catch((e: unknown) => e);
    jest.advanceTimersByTime(15000);
    const error = await pending;

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('network_error');
    jest.useRealTimers();
  });

  it('quien llama puede cancelar antes del tiempo límite', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = apiRequest('/api/rooms', { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    const error = await pending;

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('aborted');
  });
});
