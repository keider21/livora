import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { MESSAGE_TYPE, ROOM_STATUS, SEAT_STATUS, asientosDelModo } from '../../lib/constants';
import { streamProvider } from '../../streaming';
import { emitToRoom, emitToUser } from '../../realtime/bus';
import { SOCKET_EVENTS, type SeatPayload, type SeatsPayload } from '../../realtime/events';
import { postMessage } from './rooms.service';

const seatUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  level: true,
} as const;

const seatSelect = {
  userId: true,
  status: true,
  position: true,
  micMuted: true,
  user: { select: seatUserSelect },
} as const;

type SeatRow = {
  userId: string;
  status: string;
  position: number | null;
  micMuted: boolean;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; level: number };
};

function toSeat(row: SeatRow): SeatPayload {
  return {
    userId: row.userId,
    status: row.status === SEAT_STATUS.ACTIVE ? 'active' : 'pending',
    position: row.position,
    micMuted: row.micMuted,
    user: row.user,
  };
}

/** Estado completo de la tira: quién está arriba y quién espera turno. */
export async function listSeats(roomId: string): Promise<SeatsPayload> {
  const rows = await prisma.roomSeat.findMany({
    where: { roomId },
    select: seatSelect,
    orderBy: [{ position: 'asc' }, { requestedAt: 'asc' }],
  });

  return {
    roomId,
    seats: rows.filter((row) => row.status === SEAT_STATUS.ACTIVE).map(toSeat),
    pending: rows.filter((row) => row.status === SEAT_STATUS.PENDING).map(toSeat),
  };
}

/**
 * La lista de espera solo le importa al anfitrión, así que a la sala va sin
 * ella y al anfitrión le llega completa.
 */
async function broadcastSeats(roomId: string, hostId: string) {
  const state = await listSeats(roomId);
  emitToRoom(roomId, SOCKET_EVENTS.ROOM_SEATS, { ...state, pending: [] });
  emitToUser(hostId, SOCKET_EVENTS.ROOM_SEATS, state);
  return state;
}

async function liveRoom(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, hostId: true, status: true, channel: true, mode: true },
  });
  if (!room) throw HttpError.notFound('La transmisión no existe');
  if (room.status !== ROOM_STATUS.LIVE) throw HttpError.conflict('La transmisión ya terminó');
  return room;
}

/** Un espectador pide subir. Queda pendiente hasta que el anfitrión responda. */
export async function requestSeat(roomId: string, userId: string) {
  const room = await liveRoom(roomId);
  if (room.hostId === userId) throw HttpError.badRequest('Ya eres el anfitrión de esta transmisión');

  const existing = await prisma.roomSeat.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { status: true },
  });
  if (existing?.status === SEAT_STATUS.ACTIVE) throw HttpError.conflict('Ya estás arriba');
  if (existing) return { seat: existing.status, ...(await broadcastSeats(roomId, room.hostId)) };

  await prisma.roomSeat.create({
    data: { roomId, userId, status: SEAT_STATUS.PENDING },
  });

  return { seat: SEAT_STATUS.PENDING, ...(await broadcastSeats(roomId, room.hostId)) };
}

/**
 * El anfitrión acepta a alguien: se le asigna el primer hueco libre y se le
 * emiten credenciales de invitado, que solo publican micrófono.
 */
export async function acceptSeat(roomId: string, hostId: string, userId: string) {
  const room = await liveRoom(roomId);
  if (room.hostId !== hostId) throw HttpError.forbidden('Solo el anfitrión puede subir invitados');

  const seat = await prisma.roomSeat.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { status: true },
  });
  if (!seat) throw HttpError.notFound('Esa persona no ha pedido subir');
  if (seat.status === SEAT_STATUS.ACTIVE) throw HttpError.conflict('Ya está arriba');

  const taken = await prisma.roomSeat.findMany({
    where: { roomId, status: SEAT_STATUS.ACTIVE },
    select: { position: true },
  });
  const used = new Set(taken.map((row) => row.position));
  // Cuántos caben depende del formato: en audio no hay vídeo de nadie, así que
  // caben muchos más que en una sala con la cámara del anfitrión encendida.
  const huecos = asientosDelModo(room.mode);
  const position = Array.from({ length: huecos }, (_, i) => i + 1).find((slot) => !used.has(slot));
  if (position === undefined) throw HttpError.conflict('No quedan huecos libres');

  await prisma.roomSeat.update({
    where: { roomId_userId: { roomId, userId } },
    data: { status: SEAT_STATUS.ACTIVE, position, acceptedAt: new Date(), leftAt: null },
  });

  const credentials = await streamProvider.issueToken({
    channel: room.channel,
    identity: userId,
    role: 'guest',
  });

  const state = await broadcastSeats(roomId, room.hostId);
  // El invitado necesita sus credenciales para empezar a publicar voz.
  emitToUser(userId, SOCKET_EVENTS.ROOM_SEATS, { ...state, credentials });

  const guest = state.seats.find((row) => row.userId === userId);
  if (guest) {
    await postMessage(roomId, null, `${guest.user.displayName} subió a la transmisión`, MESSAGE_TYPE.SYSTEM);
  }

  return { credentials, ...state };
}

/**
 * Bajar a alguien de la tira. Lo puede hacer el propio invitado o el anfitrión;
 * también sirve para rechazar una solicitud pendiente.
 */
export async function leaveSeat(roomId: string, requesterId: string, userId: string) {
  const room = await liveRoom(roomId);
  if (requesterId !== userId && room.hostId !== requesterId) {
    throw HttpError.forbidden('Solo el anfitrión puede bajar a otra persona');
  }

  const seat = await prisma.roomSeat.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { status: true, user: { select: { displayName: true } } },
  });
  if (!seat) throw HttpError.notFound('Esa persona no está en la tira');

  await prisma.roomSeat.delete({ where: { roomId_userId: { roomId, userId } } });

  const state = await broadcastSeats(roomId, room.hostId);
  if (seat.status === SEAT_STATUS.ACTIVE) {
    await postMessage(roomId, null, `${seat.user.displayName} bajó de la transmisión`, MESSAGE_TYPE.SYSTEM);
  }
  return state;
}

/** El invitado silencia o reactiva su micrófono; el anfitrión también puede. */
export async function setSeatMic(roomId: string, requesterId: string, userId: string, micMuted: boolean) {
  const room = await liveRoom(roomId);
  if (requesterId !== userId && room.hostId !== requesterId) {
    throw HttpError.forbidden('Solo el anfitrión puede silenciar a otra persona');
  }

  const seat = await prisma.roomSeat.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { status: true },
  });
  if (!seat || seat.status !== SEAT_STATUS.ACTIVE) throw HttpError.notFound('Esa persona no está arriba');

  await prisma.roomSeat.update({ where: { roomId_userId: { roomId, userId } }, data: { micMuted } });
  return broadcastSeats(roomId, room.hostId);
}

/** Al cerrar la transmisión no queda nadie arriba. */
export async function clearSeats(roomId: string) {
  await prisma.roomSeat.deleteMany({ where: { roomId } });
}

/** Quiénes pueden recibir regalos en la sala: el anfitrión y los invitados. */
export async function giftableUserIds(roomId: string, hostId: string): Promise<Set<string>> {
  const rows = await prisma.roomSeat.findMany({
    where: { roomId, status: SEAT_STATUS.ACTIVE },
    select: { userId: true },
  });
  return new Set([hostId, ...rows.map((row) => row.userId)]);
}
