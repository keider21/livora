import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { signAccessToken } from '../../lib/jwt';
import { toPrivateUser } from '../users/user.dto';
import type { LoginInput, RegisterInput } from './auth.schema';

const BCRYPT_ROUNDS = 10;

/** Monedas de bienvenida para que una cuenta nueva pueda probar los regalos. */
const WELCOME_COINS = 500;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    throw HttpError.conflict(
      existing.email === input.email
        ? 'Ese correo ya está registrado'
        : 'Ese nombre de usuario ya está en uso',
    );
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      country: input.country,
      gender: input.gender,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      coins: WELCOME_COINS,
      avatarUrl: `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(input.username)}`,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'topup',
      currency: 'coins',
      amount: WELCOME_COINS,
      balanceAfter: WELCOME_COINS,
      reference: 'welcome_bonus',
    },
  });

  return session(user);
}

export async function login(input: LoginInput) {
  const identifier = input.identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });

  // Mismo mensaje en ambos fallos para no revelar qué cuentas existen.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw HttpError.unauthorized('Credenciales incorrectas');
  }
  if (user.isBanned) {
    throw HttpError.forbidden('Cuenta suspendida');
  }

  return session(user);
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw HttpError.notFound('Usuario no encontrado');

  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  return { user: { ...toPrivateUser(user), followers, following } };
}

function session(user: Parameters<typeof toPrivateUser>[0]) {
  return {
    token: signAccessToken({ sub: user.id, username: user.username }),
    user: toPrivateUser(user),
  };
}
