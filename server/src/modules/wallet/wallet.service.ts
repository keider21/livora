import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { COINS_PER_DIAMOND, CURRENCY, TRANSACTION_TYPE } from '../../lib/constants';
import { emitToUser } from '../../realtime/bus';
import { SOCKET_EVENTS } from '../../realtime/events';

/**
 * Paquetes de recarga. En producción cada compra debe validarse contra el
 * recibo de App Store / Google Play antes de acreditar monedas; aquí la compra
 * se simula para poder probar el flujo completo sin pasarela de pago.
 */
export const COIN_PACKAGES = [
  { id: 'starter', coins: 500, priceUsd: 4.99, bonus: 0 },
  { id: 'popular', coins: 1200, priceUsd: 9.99, bonus: 100 },
  { id: 'pro', coins: 3000, priceUsd: 24.99, bonus: 400 },
  { id: 'whale', coins: 7000, priceUsd: 49.99, bonus: 1500 },
] as const;

export async function getWallet(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coins: true, diamonds: true },
  });
  if (!user) throw HttpError.notFound('Usuario no encontrado');
  return { wallet: user, packages: COIN_PACKAGES };
}

export async function topUp(userId: string, packageId: string) {
  const pack = COIN_PACKAGES.find((item) => item.id === packageId);
  if (!pack) throw HttpError.badRequest('Paquete no válido');

  const total = pack.coins + pack.bonus;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { coins: { increment: total } },
    select: { coins: true, diamonds: true },
  });

  await prisma.transaction.create({
    data: {
      userId,
      type: TRANSACTION_TYPE.TOPUP,
      currency: CURRENCY.COINS,
      amount: total,
      balanceAfter: user.coins,
      reference: `package:${pack.id}`,
    },
  });

  emitToUser(userId, SOCKET_EVENTS.WALLET_UPDATED, user);
  return { wallet: user, credited: total };
}

/** Convierte diamantes ganados en monedas gastables. */
export async function exchangeDiamonds(userId: string, diamonds: number) {
  if (diamonds <= 0) throw HttpError.badRequest('La cantidad debe ser mayor que cero');

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { diamonds: true },
  });
  if (!current) throw HttpError.notFound('Usuario no encontrado');
  if (current.diamonds < diamonds) throw HttpError.paymentRequired('No tienes diamantes suficientes');

  const coins = Math.floor(diamonds * COINS_PER_DIAMOND);

  const wallet = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { diamonds: { decrement: diamonds }, coins: { increment: coins } },
      select: { coins: true, diamonds: true },
    });

    await tx.transaction.createMany({
      data: [
        {
          userId,
          type: TRANSACTION_TYPE.EXCHANGE,
          currency: CURRENCY.DIAMONDS,
          amount: -diamonds,
          balanceAfter: updated.diamonds,
          reference: 'exchange',
        },
        {
          userId,
          type: TRANSACTION_TYPE.EXCHANGE,
          currency: CURRENCY.COINS,
          amount: coins,
          balanceAfter: updated.coins,
          reference: 'exchange',
        },
      ],
    });

    return updated;
  });

  emitToUser(userId, SOCKET_EVENTS.WALLET_UPDATED, wallet);
  return { wallet, coins };
}

export async function listTransactions(userId: string, limit = 50) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return { transactions };
}
