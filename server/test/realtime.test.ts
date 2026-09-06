import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../src/app';
import { createSocketServer } from '../src/realtime/socket';
import { SOCKET_EVENTS } from '../src/realtime/events';
import { prisma } from '../src/lib/prisma';
import { uniqueName } from './helpers';

const httpServer = createServer(createApp());
const ioServer = createSocketServer(httpServer);
let baseUrl = '';

before(async () => {
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
  await prisma.gift.upsert({
    where: { code: 'heart' },
    create: { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, tier: 'basic', animation: 'float' },
    update: { priceCoins: 25, isActive: true },
  });
});

after(async () => {
  ioServer.close();
  httpServer.close();
  // Los manejadores de 'disconnect' del servidor aún consultan la base de datos:
  // se les da un respiro antes de cerrar la conexión de Prisma.
  await new Promise((resolve) => setTimeout(resolve, 250));
  await prisma.$disconnect();
});

async function api<T = any>(path: string, options: { method?: string; body?: unknown; token?: string } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  return { status: response.status, data: (text ? JSON.parse(text) : null) as T };
}

async function createUser() {
  const username = uniqueName('rt');
  const registered = await api('/api/auth/register', {
    method: 'POST',
    body: {
      email: `${username}@test.local`,
      username,
      password: 'contrasena123',
      displayName: `Prueba ${username}`,
    },
  });
  assert.equal(registered.status, 201);
  return { username, token: registered.data.token as string, id: registered.data.user.id as string };
}

function connectClient(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(baseUrl, { transports: ['websocket'], auth: { token }, forceNew: true });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

/** Espera un evento concreto o falla por tiempo agotado. */
function waitFor<T>(socket: Socket, event: string, predicate: (payload: T) => boolean, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`No llegó el evento ${event} en ${timeoutMs} ms`));
    }, timeoutMs);

    function handler(payload: T) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }

    socket.on(event, handler);
  });
}

describe('tiempo real', () => {
  it('rechaza conexiones sin token', async () => {
    await assert.rejects(
      () =>
        new Promise((resolve, reject) => {
          const socket = connect(baseUrl, { transports: ['websocket'], forceNew: true });
          socket.once('connect', resolve);
          socket.once('connect_error', (error) => {
            socket.close();
            reject(error);
          });
        }),
    );
  });

  it('difunde chat, aforo y regalos a los espectadores de la sala', async () => {
    const host = await createUser();
    const fan = await createUser();

    const created = await api('/api/rooms', {
      method: 'POST',
      token: host.token,
      body: { title: 'Sala en tiempo real' },
    });
    const roomId = created.data.room.id as string;

    const hostSocket = await connectClient(host.token);
    const fanSocket = await connectClient(fan.token);

    try {
      const viewersSeen = waitFor<{ roomId: string; count: number }>(
        hostSocket,
        SOCKET_EVENTS.ROOM_VIEWERS,
        (payload) => payload.roomId === roomId && payload.count >= 1,
      );
      hostSocket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId });
      fanSocket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId });
      assert.ok((await viewersSeen).count >= 1);

      const messageSeen = waitFor<{ body: string; roomId: string }>(
        hostSocket,
        SOCKET_EVENTS.ROOM_MESSAGE,
        (payload) => payload.roomId === roomId && payload.body === 'hola desde el test',
      );
      fanSocket.emit(SOCKET_EVENTS.ROOM_SEND_MESSAGE, { roomId, body: 'hola desde el test' });
      await messageSeen;

      const giftSeen = waitFor<{ roomId: string; gift: { code: string }; quantity: number }>(
        hostSocket,
        SOCKET_EVENTS.ROOM_GIFT,
        (payload) => payload.roomId === roomId,
      );
      const sent = await api('/api/gifts/send', {
        method: 'POST',
        token: fan.token,
        body: { roomId, giftCode: 'heart', quantity: 2 },
      });
      assert.equal(sent.status, 201);

      const gift = await giftSeen;
      assert.equal(gift.gift.code, 'heart');
      assert.equal(gift.quantity, 2);
    } finally {
      hostSocket.close();
      fanSocket.close();
    }
  });
});
