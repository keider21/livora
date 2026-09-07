import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import {
  CURRENCY,
  DIAMONDS_PER_COIN,
  MESSAGE_TYPE,
  ROOM_STATUS,
  TRANSACTION_TYPE,
  XP_PER_COIN_SPENT,
} from '../../lib/constants';
import { levelFromXp } from '../../lib/levels';
import { emitToRoom, emitToUser } from '../../realtime/bus';
import { SOCKET_EVENTS, type GiftEventPayload } from '../../realtime/events';
import { postMessage } from '../rooms/rooms.service';
import { giftableUserIds } from '../rooms/seats.service';
import { rollLucky } from '../../lib/lucky';
import { invalidateRankingCache } from '../ranking/ranking.service';
import type { SendGiftInput } from './gifts.schema';

export async function listGifts() {
  const gifts = await prisma.gift.findMany({
    where: { isActive: true },
    orderBy: { priceCoins: 'asc' },
  });
  return { gifts };
}

export async function sendGift(senderId: string, input: SendGiftInput) {
  const [gift, room, sender] = await Promise.all([
    prisma.gift.findUnique({ where: { code: input.giftCode } }),
    prisma.room.findUnique({
      where: { id: input.roomId },
      select: { id: true, hostId: true, status: true, totalDiamonds: true },
    }),
    prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, username: true, displayName: true, avatarUrl: true, coins: true, xp: true },
    }),
  ]);

  if (!gift || !gift.isActive) throw HttpError.notFound('Ese regalo no existe');
  if (!room) throw HttpError.notFound('La transmisión no existe');
  if (room.status !== ROOM_STATUS.LIVE) throw HttpError.conflict('La transmisión ya terminó');
  if (!sender) throw HttpError.unauthorized();

  // Sin destinatario explícito el regalo va al anfitrión, como siempre. Con él,
  // tiene que ser alguien que esté en la sala: el anfitrión o un invitado de la
  // tira. Así el anfitrión también puede regalar a sus invitados.
  const recipientId = input.recipientId ?? room.hostId;
  if (recipientId === senderId) throw HttpError.badRequest('No puedes enviarte regalos a ti mismo');

  const allowed = await giftableUserIds(room.id, room.hostId);
  if (!allowed.has(recipientId)) {
    throw HttpError.badRequest('Esa persona no está en la transmisión');
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!recipient) throw HttpError.notFound('Esa persona no existe');

  const coinsSpent = gift.priceCoins * input.quantity;
  if (sender.coins < coinsSpent) {
    throw HttpError.paymentRequired('No tienes monedas suficientes');
  }

  const diamondsEarned = Math.round(coinsSpent * DIAMONDS_PER_COIN);
  const newXp = sender.xp + coinsSpent * XP_PER_COIN_SPENT;
  // El premio se sortea una vez por envío, no por unidad.
  const lucky = rollLucky(coinsSpent, gift.luckyChance, gift.luckyMultipliers);

  // Todo el movimiento económico ocurre en una sola transacción: o se descuenta
  // al emisor y se acredita al anfitrión, o no pasa nada.
  const result = await prisma.$transaction(async (tx) => {
    // El premio se abona en el mismo movimiento que el cobro, así el saldo que
    // devuelve la llamada ya lo incluye y nunca se ve un estado intermedio.
    const updatedSender = await tx.user.update({
      where: { id: senderId },
      data: {
        coins: { decrement: coinsSpent - lucky.coins },
        xp: newXp,
        level: levelFromXp(newXp),
      },
      select: { coins: true, diamonds: true },
    });

    const updatedHost = await tx.user.update({
      where: { id: recipientId },
      data: { diamonds: { increment: diamondsEarned } },
      select: { coins: true, diamonds: true },
    });

    const updatedRoom = await tx.room.update({
      where: { id: room.id },
      data: { totalDiamonds: { increment: diamondsEarned } },
      select: { totalDiamonds: true },
    });

    const giftSend = await tx.giftSend.create({
      data: {
        giftId: gift.id,
        roomId: room.id,
        senderId,
        receiverId: recipientId,
        quantity: input.quantity,
        coinsSpent,
        diamondsEarned,
        coinsRewarded: lucky.coins,
      },
    });

    await tx.transaction.createMany({
      data: [
        {
          userId: senderId,
          type: TRANSACTION_TYPE.GIFT_SENT,
          currency: CURRENCY.COINS,
          amount: -coinsSpent,
          balanceAfter: updatedSender.coins + lucky.coins,
          reference: giftSend.id,
        },
        // El premio va como movimiento aparte para que el historial explique de
        // dónde salieron las monedas devueltas.
        ...(lucky.coins > 0
          ? [
              {
                userId: senderId,
                type: TRANSACTION_TYPE.GIFT_REWARD,
                currency: CURRENCY.COINS,
                amount: lucky.coins,
                balanceAfter: updatedSender.coins,
                reference: giftSend.id,
              },
            ]
          : []),
        {
          userId: recipientId,
          type: TRANSACTION_TYPE.GIFT_RECEIVED,
          currency: CURRENCY.DIAMONDS,
          amount: diamondsEarned,
          balanceAfter: updatedHost.diamonds,
          reference: giftSend.id,
        },
      ],
    });

    return { giftSend, updatedSender, updatedHost, updatedRoom };
  });

  const payload: GiftEventPayload = {
    id: result.giftSend.id,
    roomId: room.id,
    quantity: input.quantity,
    coinsSpent,
    diamondsEarned,
    coinsRewarded: lucky.coins,
    luckyMultiplier: lucky.multiplier,
    createdAt: result.giftSend.createdAt.toISOString(),
    gift: {
      code: gift.code,
      name: gift.name,
      emoji: gift.emoji,
      tier: gift.tier,
      animation: gift.animation,
    },
    sender: {
      id: sender.id,
      username: sender.username,
      displayName: sender.displayName,
      avatarUrl: sender.avatarUrl,
    },
    recipient,
    roomTotalDiamonds: result.updatedRoom.totalDiamonds,
  };

  // Un regalo cambia el ranking: la caché deja de valer en ese instante.
  invalidateRankingCache();

  emitToRoom(room.id, SOCKET_EVENTS.ROOM_GIFT, payload);
  emitToUser(senderId, SOCKET_EVENTS.WALLET_UPDATED, result.updatedSender);
  emitToUser(recipientId, SOCKET_EVENTS.WALLET_UPDATED, result.updatedHost);

  // El regalo también deja rastro en el chat, como en la app original. Solo
  // se dice a quién va cuando no es el anfitrión, para no repetir lo obvio.
  const destino = recipientId === room.hostId ? '' : ` a ${recipient.displayName}`;
  await postMessage(
    room.id,
    senderId,
    `envió ${input.quantity}× ${gift.name} ${gift.emoji}${destino}`,
    MESSAGE_TYPE.GIFT,
  );

  return { giftSend: payload, wallet: result.updatedSender };
}

export async function roomGiftHistory(roomId: string, limit = 30) {
  const rows = await prisma.giftSend.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      gift: true,
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return { gifts: rows };
}
