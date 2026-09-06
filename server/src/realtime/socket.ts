import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { attachIo } from './bus';
import { SOCKET_EVENTS, roomChannel, userChannel } from './events';
import * as roomsService from '../modules/rooms/rooms.service';

interface SocketData {
  userId: string;
  username: string;
  /** Salas a las que este socket está unido, para limpiar al desconectar. */
  rooms: Set<string>;
}

/** Ventana mínima entre mensajes de un mismo socket, en milisegundos. */
const MESSAGE_COOLDOWN_MS = 700;

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin.includes('*') ? true : env.corsOrigin,
      credentials: true,
    },
  });

  // El token viaja en el handshake: una conexión anónima nunca llega a los
  // manejadores de eventos.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Falta el token de acceso'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data = { userId: payload.sub, username: payload.username, rooms: new Set() } as SocketData;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const data = socket.data as SocketData;
    socket.join(userChannel(data.userId));

    let lastMessageAt = 0;

    socket.on(SOCKET_EVENTS.ROOM_JOIN, async (payload: { roomId?: string }) => {
      const roomId = payload?.roomId;
      if (!roomId) return;
      try {
        await socket.join(roomChannel(roomId));
        data.rooms.add(roomId);
        await roomsService.syncViewerCount(roomId);

        const user = await prisma.user.findUnique({
          where: { id: data.userId },
          select: { displayName: true },
        });
        await roomsService.postMessage(roomId, data.userId, `${user?.displayName ?? 'Alguien'} entró`, 'join');
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_LEAVE, async (payload: { roomId?: string }) => {
      const roomId = payload?.roomId;
      if (!roomId) return;
      await socket.leave(roomChannel(roomId));
      data.rooms.delete(roomId);
      await roomsService.syncViewerCount(roomId).catch(() => undefined);
    });

    socket.on(SOCKET_EVENTS.ROOM_SEND_MESSAGE, async (payload: { roomId?: string; body?: string }) => {
      const body = payload?.body?.trim();
      if (!payload?.roomId || !body) return;
      if (body.length > 200) {
        emitError(socket, new Error('El mensaje supera los 200 caracteres'));
        return;
      }
      if (Date.now() - lastMessageAt < MESSAGE_COOLDOWN_MS) {
        emitError(socket, new Error('Estás enviando mensajes demasiado rápido'));
        return;
      }
      lastMessageAt = Date.now();

      try {
        await roomsService.postMessage(payload.roomId, data.userId, body);
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_LIKE, async (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      await roomsService.likeRoom(payload.roomId).catch((error) => emitError(socket, error));
    });

    socket.on('disconnect', async () => {
      // Al caerse la conexión hay que recalcular el aforo de cada sala que
      // estaba viendo, o el contador quedaría inflado para siempre.
      for (const roomId of data.rooms) {
        await roomsService.syncViewerCount(roomId).catch(() => undefined);
      }
    });
  });

  attachIo(io);
  return io;
}

function emitError(socket: Socket, error: unknown): void {
  socket.emit(SOCKET_EVENTS.ERROR, {
    message: error instanceof Error ? error.message : 'Error inesperado',
  });
}
