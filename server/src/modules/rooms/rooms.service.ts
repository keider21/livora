import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { BIENVENIDA_POR_DEFECTO, MESSAGE_TYPE, ROOM_STATUS } from '../../lib/constants';
import { streamProvider, type StreamRole } from '../../streaming';
import { publicUserSelect } from '../users/user.dto';
import { countRoomViewers, emitToRoom } from '../../realtime/bus';
import { SOCKET_EVENTS, type ChatMessagePayload } from '../../realtime/events';
import { roomSelect, toRoom } from './room.dto';
import { clearSeats } from './seats.service';
import { progresoDelDia } from '../hosts/salary.service';
import type { CreateRoomInput, ListRoomsInput } from './rooms.schema';

const MESSAGE_HISTORY = 50;

export async function listRooms(input: ListRoomsInput) {
  const rooms = await prisma.room.findMany({
    where: {
      status: input.status,
      ...(input.category ? { category: input.category } : {}),
    },
    select: roomSelect,
    orderBy: [{ viewerCount: 'desc' }, { startedAt: 'desc' }],
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  const hasMore = rooms.length > input.limit;
  const page = hasMore ? rooms.slice(0, input.limit) : rooms;

  return {
    rooms: page.map(toRoom),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

export async function createRoom(hostId: string, input: CreateRoomInput) {
  // Una cuenta solo puede tener una transmisión abierta: si quedó una viva por
  // un cierre abrupto de la app, se cierra antes de abrir la nueva.
  const previous = await prisma.room.findFirst({
    where: { hostId, status: ROOM_STATUS.LIVE },
    select: { id: true },
  });
  if (previous) {
    await endRoom(previous.id, hostId).catch(() => undefined);
  }

  const id = crypto.randomUUID();
  const channel = await streamProvider.createChannel(id);

  const room = await prisma.room.create({
    data: {
      id,
      hostId,
      title: input.title,
      category: input.category,
      coverUrl: input.coverUrl,
      channel,
      status: ROOM_STATUS.LIVE,
      mode: input.mode,
      welcome: input.welcome?.trim() || BIENVENIDA_POR_DEFECTO,
    },
    select: roomSelect,
  });

  // La bienvenida se anuncia en el chat, que es donde mira quien entra. Va como
  // mensaje del sistema y no del anfitrión: así no parece que la esté
  // escribiendo cada vez que alguien aparece.
  await postMessage(room.id, hostId, room.welcome ?? BIENVENIDA_POR_DEFECTO, MESSAGE_TYPE.SYSTEM);

  await prisma.user.update({ where: { id: hostId }, data: { isHost: true } });

  const credentials = await streamProvider.issueToken({
    channel,
    identity: hostId,
    role: 'host',
  });

  return { room: toRoom(room), credentials };
}

export async function getRoom(roomId: string, viewerId?: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: roomSelect });
  if (!room) throw HttpError.notFound('La transmisión no existe');

  const [messages, isFollowingHost, meta] = await Promise.all([
    recentMessages(roomId),
    viewerId
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: room.host.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    progresoDelDia(room.host.id),
  ]);

  return {
    room: toRoom(room),
    messages,
    isHost: viewerId === room.host.id,
    isFollowingHost: Boolean(isFollowingHost),
    /**
     * La meta del anfitrión al abrir la sala. Va aquí y no en una llamada aparte
     * porque la barra tiene que estar llena desde el primer fotograma; a partir
     * de ahí la mantiene al día el evento `room:goal`.
     */
    meta: {
      luckyCoins: meta.luckyCoins,
      nivel: meta.nivel,
      base: meta.base,
      siguiente: meta.siguiente,
      liveSeconds: meta.liveSeconds,
      segundosMinimos: meta.segundosMinimos,
      cumpleHoras: meta.cumpleHoras,
      niveles: meta.niveles,
    },
  };
}

/** Entra a una sala y devuelve las credenciales de vídeo del participante. */
export async function joinRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, channel: true, status: true, hostId: true },
  });
  if (!room) throw HttpError.notFound('La transmisión no existe');
  if (room.status !== ROOM_STATUS.LIVE) throw HttpError.conflict('La transmisión ya terminó');

  const role: StreamRole = room.hostId === userId ? 'host' : 'viewer';
  const credentials = await streamProvider.issueToken({
    channel: room.channel,
    identity: userId,
    role,
  });

  return { credentials, role };
}

export async function endRoom(roomId: string, hostId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, hostId: true, status: true, channel: true, startedAt: true, totalDiamonds: true, peakViewers: true },
  });
  if (!room) throw HttpError.notFound('La transmisión no existe');
  if (room.hostId !== hostId) throw HttpError.forbidden('Solo el anfitrión puede terminar la transmisión');
  if (room.status === ROOM_STATUS.ENDED) throw HttpError.conflict('La transmisión ya terminó');

  const endedAt = new Date();
  await prisma.room.update({
    where: { id: roomId },
    data: { status: ROOM_STATUS.ENDED, endedAt, viewerCount: 0 },
  });
  // Al cerrar no queda nadie arriba: si no se limpia, una sala nueva del mismo
  // anfitrión heredaría invitados fantasma.
  await clearSeats(roomId);
  await streamProvider.closeChannel(room.channel);

  const summary = {
    roomId,
    durationSeconds: Math.max(0, Math.round((endedAt.getTime() - room.startedAt.getTime()) / 1000)),
    totalDiamonds: room.totalDiamonds,
    peakViewers: room.peakViewers,
  };

  emitToRoom(roomId, SOCKET_EVENTS.ROOM_ENDED, summary);
  return { summary };
}

export async function recentMessages(roomId: string): Promise<ChatMessagePayload[]> {
  const rows = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: MESSAGE_HISTORY,
    include: { user: { select: publicUserSelect } },
  });

  return rows.reverse().map((row) => ({
    id: row.id,
    roomId: row.roomId,
    type: row.type as ChatMessagePayload['type'],
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    user: row.user
      ? {
          id: row.user.id,
          username: row.user.username,
          displayName: row.user.displayName,
          avatarUrl: row.user.avatarUrl,
          level: row.user.level,
        }
      : null,
  }));
}

/** Guarda un mensaje de chat y lo difunde a la sala. */
export async function postMessage(
  roomId: string,
  userId: string | null,
  body: string,
  type: string = MESSAGE_TYPE.TEXT,
): Promise<ChatMessagePayload> {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { status: true } });
  if (!room) throw HttpError.notFound('La transmisión no existe');
  if (room.status !== ROOM_STATUS.LIVE) throw HttpError.conflict('La transmisión ya terminó');

  const message = await prisma.message.create({
    data: { roomId, userId, body, type },
    include: { user: { select: publicUserSelect } },
  });

  const payload: ChatMessagePayload = {
    id: message.id,
    roomId,
    type: type as ChatMessagePayload['type'],
    body,
    createdAt: message.createdAt.toISOString(),
    user: message.user
      ? {
          id: message.user.id,
          username: message.user.username,
          displayName: message.user.displayName,
          avatarUrl: message.user.avatarUrl,
          level: message.user.level,
        }
      : null,
  };

  emitToRoom(roomId, SOCKET_EVENTS.ROOM_MESSAGE, payload);
  return payload;
}

export async function likeRoom(roomId: string, amount = 1) {
  const room = await prisma.room.update({
    where: { id: roomId },
    data: { totalLikes: { increment: amount } },
    select: { totalLikes: true },
  });
  emitToRoom(roomId, SOCKET_EVENTS.ROOM_LIKES, { roomId, totalLikes: room.totalLikes });
  return { totalLikes: room.totalLikes };
}

/**
 * Sincroniza el contador persistido con las conexiones reales y avisa a la sala.
 * Se llama al entrar y al salir un espectador.
 */
export async function syncViewerCount(roomId: string): Promise<number> {
  const count = await countRoomViewers(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { peakViewers: true } });
  if (!room) return count;

  await prisma.room.update({
    where: { id: roomId },
    data: { viewerCount: count, peakViewers: Math.max(room.peakViewers, count) },
  });

  emitToRoom(roomId, SOCKET_EVENTS.ROOM_VIEWERS, { roomId, count });
  return count;
}
