import type { Server } from 'socket.io';
import { roomChannel, userChannel } from './events';

/**
 * Puente entre la capa HTTP y la de sockets: los servicios emiten eventos sin
 * depender de cómo se creó el servidor de Socket.IO.
 */
let io: Server | null = null;

export function attachIo(server: Server): void {
  io = server;
}

export function emitToRoom(roomId: string, event: string, payload: unknown): void {
  io?.to(roomChannel(roomId)).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userChannel(userId)).emit(event, payload);
}

/** Espectadores conectados a una sala, según las conexiones vivas de Socket.IO. */
export async function countRoomViewers(roomId: string): Promise<number> {
  if (!io) return 0;
  const sockets = await io.in(roomChannel(roomId)).fetchSockets();
  return sockets.length;
}
