import type { Prisma, User } from '@prisma/client';
import { levelProgress } from '../../lib/levels';

/** Campos que se exponen de cualquier usuario, incluso a terceros. */
export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  country: true,
  gender: true,
  level: true,
  xp: true,
  isHost: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  gender: string;
  level: number;
  xp: number;
  isHost: boolean;
  createdAt: string;
}

export function toPublicUser(user: PublicUserRow): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    country: user.country,
    gender: user.gender,
    level: user.level,
    xp: user.xp,
    isHost: user.isHost,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Perfil propio: añade el monedero y el progreso de nivel. */
export function toPrivateUser(user: User) {
  return {
    ...toPublicUser(user),
    email: user.email,
    coins: user.coins,
    diamonds: user.diamonds,
    ...levelProgress(user.xp),
  };
}
