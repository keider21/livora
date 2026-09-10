import type { Prisma } from '@prisma/client';
import { asientosDelModo } from '../../lib/constants';
import { publicUserSelect, toPublicUser } from '../users/user.dto';

export const roomSelect = {
  id: true,
  title: true,
  coverUrl: true,
  category: true,
  status: true,
  mode: true,
  welcome: true,
  channel: true,
  viewerCount: true,
  peakViewers: true,
  totalDiamonds: true,
  totalLikes: true,
  startedAt: true,
  endedAt: true,
  host: { select: publicUserSelect },
} satisfies Prisma.RoomSelect;

export type RoomRow = Prisma.RoomGetPayload<{ select: typeof roomSelect }>;

export function toRoom(room: RoomRow) {
  return {
    id: room.id,
    title: room.title,
    coverUrl: room.coverUrl,
    category: room.category,
    status: room.status,
    mode: room.mode,
    welcome: room.welcome,
    /** Cuántos caben arriba en este formato. */
    maxSeats: asientosDelModo(room.mode),
    channel: room.channel,
    viewerCount: room.viewerCount,
    peakViewers: room.peakViewers,
    totalDiamonds: room.totalDiamonds,
    totalLikes: room.totalLikes,
    startedAt: room.startedAt.toISOString(),
    endedAt: room.endedAt?.toISOString() ?? null,
    host: toPublicUser(room.host),
  };
}

export type Room = ReturnType<typeof toRoom>;
