import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import {
  CURRENCY,
  DIAMONDS_PER_COIN,
  DIAMONDS_PER_COIN_EXCLUSIVE,
  GIFT_TIER_EXCLUSIVE,
  MESSAGE_TYPE,
  ROOM_STATUS,
  TRANSACTION_TYPE,
  XP_PER_COIN_SPENT,
  fanLevelFromCoins,
} from '../../lib/constants';
import { levelFromXp } from '../../lib/levels';
import { emitToRoom, emitToUser } from '../../realtime/bus';
import { SOCKET_EVENTS, type GiftEventPayload } from '../../realtime/events';
import { postMessage } from '../rooms/rooms.service';
import { giftableUserIds } from '../rooms/seats.service';
import { rollLucky } from '../../lib/lucky';
import { bonusRacha } from '../../lib/lucky-window';
import { invalidateRankingCache } from '../ranking/ranking.service';
import type { SendGiftInput } from './gifts.schema';

const recipientSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

/**
 * Catálogo. Con `roomId` se añade el nivel de club de fans que tiene quien
 * pregunta con ese anfitrión, para que la app sepa qué regalos puede enviar.
 */
export async function listGifts(viewerId?: string, roomId?: string) {
  const gifts = await prisma.gift.findMany({
    where: { isActive: true },
    orderBy: { priceCoins: 'asc' },
  });

  if (!viewerId || !roomId) return { gifts, fanLevel: 0 };

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } });
  return { gifts, fanLevel: room ? await fanLevel(viewerId, room.hostId) : 0 };
}

/**
 * Nivel de club de fans, que sale de lo gastado históricamente con ese
 * anfitrión. No se guarda en ninguna columna: se calcula de los regalos, que ya
 * son la fuente de verdad, y así no puede quedar desincronizado.
 */
export async function fanLevel(userId: string, hostId: string): Promise<number> {
  const gastado = await prisma.giftSend.aggregate({
    where: { senderId: userId, receiverId: hostId },
    _sum: { coinsSpent: true },
  });
  return fanLevelFromCoins(gastado._sum.coinsSpent ?? 0);
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

  // Sin destinatarios explícitos el regalo va al anfitrión, como siempre. Se
  // puede elegir a varios a la vez, y uno de ellos puede ser uno mismo: los
  // regalos con premio se usan también para jugar con el propio saldo.
  const recipientIds = input.recipientIds?.length ? [...new Set(input.recipientIds)] : [room.hostId];

  const allowed = await giftableUserIds(room.id, room.hostId);
  for (const id of recipientIds) {
    if (!allowed.has(id) && id !== senderId) {
      throw HttpError.badRequest('Esa persona no está en la transmisión');
    }
  }

  const esExclusivo = gift.tier === GIFT_TIER_EXCLUSIVE;
  // Los exclusivos son piezas únicas: se manda una a cada destinatario.
  const quantity = esExclusivo ? 1 : input.quantity;

  if (gift.minFanLevel > 0) {
    const nivel = await fanLevel(senderId, room.hostId);
    if (nivel < gift.minFanLevel) {
      throw HttpError.badRequest(
        `Necesitas ser fan nivel ${gift.minFanLevel} de este anfitrión para enviar ${gift.name}`,
      );
    }
  }

  const recipients = await prisma.user.findMany({
    where: { id: { in: recipientIds } },
    select: recipientSelect,
  });
  if (recipients.length !== recipientIds.length) throw HttpError.notFound('Alguien de la lista no existe');

  const coinsPorDestinatario = gift.priceCoins * quantity;
  const coinsSpent = coinsPorDestinatario * recipients.length;
  if (sender.coins < coinsSpent) {
    throw HttpError.paymentRequired('No tienes monedas suficientes');
  }

  // Cada destinatario tiene su propio sorteo, y dentro de él una tirada por
  // unidad, así que un paquete de 50 puede premiar muchas veces.
  //
  // Durante una racha la probabilidad se multiplica. Se calcula una sola vez por
  // envío: si se mirase el reloj en cada unidad, un paquete grande podría caer a
  // caballo entre dentro y fuera de la racha.
  const probabilidad = gift.luckyChance * bonusRacha();
  const tasaDiamantes = esExclusivo ? DIAMONDS_PER_COIN_EXCLUSIVE : DIAMONDS_PER_COIN;
  const envios = recipients.map((recipient) => {
    const lucky = rollLucky(gift.priceCoins, quantity, probabilidad, gift.luckyMultipliers);
    return {
      recipient,
      lucky,
      diamondsEarned: Math.round(coinsPorDestinatario * tasaDiamantes),
    };
  });

  const coinsRewarded = envios.reduce((total, envio) => total + envio.lucky.coins, 0);
  const newXp = sender.xp + coinsSpent * XP_PER_COIN_SPENT;

  // Todo el movimiento económico ocurre en una sola transacción: o se cobra al
  // emisor y se acredita a todos, o no pasa nada.
  const result = await prisma.$transaction(async (tx) => {
    const updatedSender = await tx.user.update({
      where: { id: senderId },
      data: {
        coins: { decrement: coinsSpent - coinsRewarded },
        xp: newXp,
        level: levelFromXp(newXp),
      },
      select: { coins: true, diamonds: true },
    });

    const registros = [];
    for (const envio of envios) {
      const giftSend = await tx.giftSend.create({
        data: {
          giftId: gift.id,
          roomId: room.id,
          senderId,
          receiverId: envio.recipient.id,
          quantity,
          coinsSpent: coinsPorDestinatario,
          diamondsEarned: envio.diamondsEarned,
          coinsRewarded: envio.lucky.coins,
        },
      });

      // Regalarse a uno mismo mueve monedas propias a diamantes propios: el
      // saldo de quien envía ya está actualizado, así que se lee de ahí.
      const esYo = envio.recipient.id === senderId;
      const updatedRecipient = await tx.user.update({
        where: { id: envio.recipient.id },
        data: { diamonds: { increment: envio.diamondsEarned } },
        select: { coins: true, diamonds: true },
      });

      await tx.transaction.createMany({
        data: [
          {
            userId: envio.recipient.id,
            type: TRANSACTION_TYPE.GIFT_RECEIVED,
            currency: CURRENCY.DIAMONDS,
            amount: envio.diamondsEarned,
            balanceAfter: updatedRecipient.diamonds,
            reference: giftSend.id,
          },
        ],
      });

      registros.push({ giftSend, envio, updatedRecipient, esYo });
    }

    await tx.transaction.createMany({
      data: [
        {
          userId: senderId,
          type: TRANSACTION_TYPE.GIFT_SENT,
          currency: CURRENCY.COINS,
          amount: -coinsSpent,
          balanceAfter: updatedSender.coins + coinsRewarded,
          reference: registros[0]?.giftSend.id ?? null,
        },
        // El premio va como movimiento aparte para que el historial explique de
        // dónde salieron las monedas devueltas.
        ...(coinsRewarded > 0
          ? [
              {
                userId: senderId,
                type: TRANSACTION_TYPE.GIFT_REWARD,
                currency: CURRENCY.COINS,
                amount: coinsRewarded,
                balanceAfter: updatedSender.coins,
                reference: registros[0]?.giftSend.id ?? null,
              },
            ]
          : []),
      ],
    });

    const updatedRoom = await tx.room.update({
      where: { id: room.id },
      data: { totalDiamonds: { increment: envios.reduce((t, e) => t + e.diamondsEarned, 0) } },
      select: { totalDiamonds: true },
    });

    return { registros, updatedSender, updatedRoom };
  });

  const senderInfo = {
    id: sender.id,
    username: sender.username,
    displayName: sender.displayName,
    avatarUrl: sender.avatarUrl,
  };

  const payloads: GiftEventPayload[] = result.registros.map(({ giftSend, envio }) => ({
    id: giftSend.id,
    roomId: room.id,
    quantity,
    coinsSpent: coinsPorDestinatario,
    diamondsEarned: envio.diamondsEarned,
    coinsRewarded: envio.lucky.coins,
    luckyMultiplier: envio.lucky.multiplier,
    luckyWins: envio.lucky.wins,
    luckyTimes: envio.lucky.times,
    createdAt: giftSend.createdAt.toISOString(),
    gift: {
      code: gift.code,
      name: gift.name,
      emoji: gift.emoji,
      // Sin esto la app no sabe que el regalo tiene ilustración y cae al emoji.
      image: gift.image,
      tier: gift.tier,
      animation: gift.animation,
    },
    sender: senderInfo,
    recipient: envio.recipient,
    roomTotalDiamonds: result.updatedRoom.totalDiamonds,
  }));

  // Un regalo cambia el ranking: la caché deja de valer en ese instante.
  invalidateRankingCache();

  for (const payload of payloads) {
    emitToRoom(room.id, SOCKET_EVENTS.ROOM_GIFT, payload);
  }
  emitToUser(senderId, SOCKET_EVENTS.WALLET_UPDATED, result.updatedSender);
  for (const registro of result.registros) {
    if (!registro.esYo) {
      emitToUser(registro.envio.recipient.id, SOCKET_EVENTS.WALLET_UPDATED, registro.updatedRecipient);
    }
  }

  // El regalo también deja rastro en el chat, como en la app original. Solo se
  // dice a quién va cuando no es únicamente el anfitrión.
  const soloAlAnfitrion = recipients.length === 1 && recipients[0]!.id === room.hostId;
  const destino = soloAlAnfitrion ? '' : ` a ${recipients.map((r) => r.displayName).join(', ')}`;
  await postMessage(
    room.id,
    senderId,
    `envió ${quantity}× ${gift.name} ${gift.emoji}${destino}`,
    MESSAGE_TYPE.GIFT,
  );

  return { giftSend: payloads[0]!, giftSends: payloads, wallet: result.updatedSender };
}

export async function roomGiftHistory(roomId: string, limit = 30) {
  const rows = await prisma.giftSend.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      gift: true,
      sender: { select: recipientSelect },
    },
  });
  return { gifts: rows };
}
