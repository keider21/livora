import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { ROOM_STATUS } from '../../lib/constants';
import { publicUserSelect, toPublicUser } from './user.dto';

export async function getProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: publicUserSelect,
  });
  if (!user) throw HttpError.notFound('Usuario no encontrado');

  const [followers, following, isFollowing, liveRoom] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    viewerId
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.room.findFirst({
      where: { hostId: user.id, status: 'live' },
      select: { id: true, title: true, viewerCount: true },
    }),
  ]);

  return {
    user: toPublicUser(user),
    stats: { followers, following },
    isFollowing: Boolean(isFollowing),
    isSelf: viewerId === user.id,
    liveRoom,
  };
}

export async function search(term: string, limit = 20) {
  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
      OR: [{ username: { contains: term } }, { displayName: { contains: term } }],
    },
    select: publicUserSelect,
    orderBy: [{ isHost: 'desc' }, { level: 'desc' }],
    take: limit,
  });
  return { users: users.map(toPublicUser) };
}

export async function follow(followerId: string, targetUsername: string) {
  const target = await requireTarget(targetUsername);
  if (target.id === followerId) throw HttpError.badRequest('No puedes seguirte a ti mismo');

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId: target.id } },
    create: { followerId, followingId: target.id },
    update: {},
  });

  return { following: true, followers: await prisma.follow.count({ where: { followingId: target.id } }) };
}

export async function unfollow(followerId: string, targetUsername: string) {
  const target = await requireTarget(targetUsername);

  await prisma.follow.deleteMany({ where: { followerId, followingId: target.id } });

  return { following: false, followers: await prisma.follow.count({ where: { followingId: target.id } }) };
}

export async function listFollowers(username: string) {
  const target = await requireTarget(username);
  const rows = await prisma.follow.findMany({
    where: { followingId: target.id },
    select: { follower: { select: publicUserSelect } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return { users: rows.map((row) => toPublicUser(row.follower)) };
}

export async function listFollowing(username: string) {
  const target = await requireTarget(username);
  const rows = await prisma.follow.findMany({
    where: { followerId: target.id },
    select: { following: { select: publicUserSelect } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return { users: rows.map((row) => toPublicUser(row.following)) };
}

export async function updateProfile(
  userId: string,
  data: { displayName?: string; bio?: string; avatarUrl?: string; country?: string; status?: string },
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: publicUserSelect,
  });
  return { user: toPublicUser(user) };
}

/** Transmisiones ya terminadas de un anfitrión, de la más reciente a la más antigua. */
export async function listStreams(username: string, limit = 20) {
  const target = await requireTarget(username);
  const rooms = await prisma.room.findMany({
    where: { hostId: target.id, status: ROOM_STATUS.ENDED },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      startedAt: true,
      endedAt: true,
      peakViewers: true,
      totalDiamonds: true,
      totalLikes: true,
    },
  });

  return {
    streams: rooms.map((room) => ({
      id: room.id,
      title: room.title,
      category: room.category,
      startedAt: room.startedAt.toISOString(),
      endedAt: room.endedAt?.toISOString() ?? null,
      durationSeconds: room.endedAt
        ? Math.max(0, Math.round((room.endedAt.getTime() - room.startedAt.getTime()) / 1000))
        : 0,
      peakViewers: room.peakViewers,
      totalDiamonds: room.totalDiamonds,
      totalLikes: room.totalLikes,
    })),
  };
}

async function requireTarget(username: string) {
  const target = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true },
  });
  if (!target) throw HttpError.notFound('Usuario no encontrado');
  return target;
}
