import { prisma } from '../../lib/prisma';
import { TtlCache } from '../../lib/ttl-cache';
import { publicUserSelect, toPublicUser } from '../users/user.dto';

export type RankingPeriod = 'day' | 'week' | 'all';

export interface RankingEntry {
  rank: number;
  score: number;
  user: ReturnType<typeof toPublicUser>;
}

/**
 * El ranking agrega todos los regalos del periodo en cada lectura. Se cachea
 * un minuto, y además se vacía cada vez que se envía un regalo (ver
 * gifts.service), así nunca se sirve un ranking anterior al último regalo.
 * El minuto cubre solo el envejecimiento de entradas que salen del periodo.
 */
const RANKING_TTL_MS = 60 * 1000;
const cache = new TtlCache<RankingEntry[]>(RANKING_TTL_MS);

export function invalidateRankingCache(): void {
  cache.clear();
}

export function rankingCacheStats() {
  return cache.stats();
}

function since(period: RankingPeriod): Date | undefined {
  if (period === 'all') return undefined;
  const days = period === 'day' ? 1 : 7;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Anfitriones con más diamantes recibidos en el periodo. */
export async function topHosts(period: RankingPeriod = 'week', limit = 20) {
  const entries = await cache.getOrCompute(`hosts:${period}:${limit}`, async () => {
    const from = since(period);
    const grouped = await prisma.giftSend.groupBy({
      by: ['receiverId'],
      where: from ? { createdAt: { gte: from } } : undefined,
      _sum: { diamondsEarned: true },
      orderBy: { _sum: { diamondsEarned: 'desc' } },
      take: limit,
    });
    return hydrate(grouped.map((row) => ({ userId: row.receiverId, score: row._sum.diamondsEarned ?? 0 })));
  });
  return { entries };
}

/** Usuarios que más monedas han gastado en regalos en el periodo. */
export async function topSenders(period: RankingPeriod = 'week', limit = 20) {
  const entries = await cache.getOrCompute(`senders:${period}:${limit}`, async () => {
    const from = since(period);
    const grouped = await prisma.giftSend.groupBy({
      by: ['senderId'],
      where: from ? { createdAt: { gte: from } } : undefined,
      _sum: { coinsSpent: true },
      orderBy: { _sum: { coinsSpent: 'desc' } },
      take: limit,
    });
    return hydrate(grouped.map((row) => ({ userId: row.senderId, score: row._sum.coinsSpent ?? 0 })));
  });
  return { entries };
}

async function hydrate(rows: Array<{ userId: string; score: number }>): Promise<RankingEntry[]> {
  if (rows.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((row) => row.userId) } },
    select: publicUserSelect,
  });
  const byId = new Map(users.map((user) => [user.id, user]));

  return rows
    .map((row, index) => {
      const user = byId.get(row.userId);
      return user ? { rank: index + 1, score: row.score, user: toPublicUser(user) } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}
