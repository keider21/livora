import { gifts, rooms } from '../index';
import { setAuthToken } from '../client';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit]>;

function mockResponse(body: unknown = {}): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue(mockResponse());
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setAuthToken('token-de-prueba');
});

/** Ruta y método de la última llamada, que es lo que importa comprobar aquí. */
function lastCall() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
  return { path: url.replace(/^https?:\/\/[^/]+/, ''), method: init.method, body: init.body };
}

describe('invitados de la tira lateral', () => {
  it('pedir subir va al endpoint de solicitud', async () => {
    await rooms.requestSeat('sala-1');
    expect(lastCall()).toMatchObject({ path: '/api/rooms/sala-1/seats/request', method: 'POST' });
  });

  it('aceptar identifica a quién se sube', async () => {
    await rooms.acceptSeat('sala-1', 'usuario-9');
    expect(lastCall()).toMatchObject({ path: '/api/rooms/sala-1/seats/usuario-9/accept', method: 'POST' });
  });

  it('bajar a alguien usa DELETE sobre su hueco', async () => {
    await rooms.removeSeat('sala-1', 'usuario-9');
    expect(lastCall()).toMatchObject({ path: '/api/rooms/sala-1/seats/usuario-9', method: 'DELETE' });
  });

  it('silenciar manda el estado del micrófono', async () => {
    await rooms.setSeatMic('sala-1', 'usuario-9', true);
    const call = lastCall();
    expect(call).toMatchObject({ path: '/api/rooms/sala-1/seats/usuario-9/mic', method: 'PATCH' });
    expect(JSON.parse(call.body as string)).toEqual({ micMuted: true });
  });
});

describe('regalos con destinatario', () => {
  it('sin destinatario no se envía el campo, y el servidor se lo da al anfitrión', async () => {
    await gifts.send({ roomId: 'sala-1', giftCode: 'rose', quantity: 2 });
    const body = JSON.parse(lastCall().body as string);
    expect(body).toEqual({ roomId: 'sala-1', giftCode: 'rose', quantity: 2 });
    expect(body).not.toHaveProperty('recipientId');
  });

  it('con destinatario lo incluye', async () => {
    await gifts.send({ roomId: 'sala-1', giftCode: 'rose', recipientId: 'invitado-3' });
    expect(JSON.parse(lastCall().body as string)).toEqual({
      roomId: 'sala-1',
      giftCode: 'rose',
      recipientId: 'invitado-3',
    });
  });
});
