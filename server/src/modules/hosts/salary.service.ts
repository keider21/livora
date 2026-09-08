import { prisma } from '../../lib/prisma';
import { CURRENCY, GIFT_TIER_EXCLUSIVE, TRANSACTION_TYPE } from '../../lib/constants';
import {
  NIVELES,
  SEGUNDOS_MINIMOS_EN_VIVO,
  diaDe,
  limitesDelDia,
  nivelPara,
  siguienteNivel,
} from '../../lib/salary';
import { emitToUser } from '../../realtime/bus';
import { SOCKET_EVENTS } from '../../realtime/events';

/**
 * Progreso de un anfitrión en un día.
 *
 * No se guarda en ninguna tabla: se calcula de los regalos y las transmisiones,
 * que ya son la fuente de verdad. Así no puede quedar desincronizado ni hace
 * falta mantener contadores en cada envío.
 */
export async function progresoDelDia(hostId: string, dia: string = diaDe()) {
  const { desde, hasta } = limitesDelDia(dia);

  const [regalos, salas] = await Promise.all([
    // Solo los regalos de la suerte: los exclusivos y los del club ya dejan el
    // 70% a quien los recibe, así que contarlos aquí sería pagar dos veces.
    prisma.giftSend.aggregate({
      where: {
        receiverId: hostId,
        createdAt: { gte: desde, lt: hasta },
        gift: { tier: { not: GIFT_TIER_EXCLUSIVE } },
      },
      _sum: { coinsSpent: true },
    }),
    prisma.room.findMany({
      where: {
        hostId,
        startedAt: { lt: hasta },
        OR: [{ endedAt: null }, { endedAt: { gt: desde } }],
      },
      select: { startedAt: true, endedAt: true },
    }),
  ]);

  // Una transmisión puede empezar antes de medianoche y acabar después, así que
  // de cada una se cuenta solo el trozo que cae dentro del día.
  const ahora = new Date();
  const liveSeconds = salas.reduce((total, sala) => {
    const inicio = Math.max(sala.startedAt.getTime(), desde.getTime());
    const fin = Math.min((sala.endedAt ?? ahora).getTime(), hasta.getTime());
    return total + Math.max(0, Math.round((fin - inicio) / 1000));
  }, 0);

  const luckyCoins = regalos._sum.coinsSpent ?? 0;
  const nivel = nivelPara(luckyCoins);
  const siguiente = siguienteNivel(luckyCoins);

  return {
    dia,
    luckyCoins,
    liveSeconds,
    /** Si ya cumple el mínimo de directo; sin él no se cobra nada. */
    cumpleHoras: liveSeconds >= SEGUNDOS_MINIMOS_EN_VIVO,
    segundosMinimos: SEGUNDOS_MINIMOS_EN_VIVO,
    nivel: nivel?.nivel ?? 0,
    /** Lo que cobraría si el día terminase ahora. */
    salarioEstimado: nivel && liveSeconds >= SEGUNDOS_MINIMOS_EN_VIVO ? nivel.salario : 0,
    siguiente,
    niveles: NIVELES,
  };
}

/** Lo cobrado en los últimos días, para la pantalla del anfitrión. */
export async function historialDeSalario(hostId: string, limit = 30) {
  return prisma.hostSalary.findMany({
    where: { hostId },
    orderBy: { day: 'desc' },
    take: limit,
  });
}

/**
 * Liquida un día para todos los anfitriones que llegaron a alguna meta.
 *
 * Es idempotente: la clave única por anfitrión y día hace que un segundo
 * intento no vuelva a pagar. Eso importa porque la liquidación se lanza también
 * al arrancar el servidor, por si estuvo apagado a la hora del corte.
 */
export async function liquidarDia(dia: string) {
  const { desde, hasta } = limitesDelDia(dia);

  // Solo se mira a quien recibió algo ese día: el resto no puede llegar a meta.
  const candidatos = await prisma.giftSend.groupBy({
    by: ['receiverId'],
    where: {
      createdAt: { gte: desde, lt: hasta },
      gift: { tier: { not: GIFT_TIER_EXCLUSIVE } },
    },
    _sum: { coinsSpent: true },
  });

  const pagados = [];

  for (const candidato of candidatos) {
    const luckyCoins = candidato._sum.coinsSpent ?? 0;
    const nivel = nivelPara(luckyCoins);
    if (!nivel) continue;

    const progreso = await progresoDelDia(candidato.receiverId, dia);
    if (!progreso.cumpleHoras) continue;

    const yaPagado = await prisma.hostSalary.findUnique({
      where: { hostId_day: { hostId: candidato.receiverId, day: dia } },
    });
    if (yaPagado) continue;

    const wallet = await prisma.$transaction(async (tx) => {
      const usuario = await tx.user.update({
        where: { id: candidato.receiverId },
        data: { diamonds: { increment: nivel.salario } },
        select: { coins: true, diamonds: true },
      });

      await tx.hostSalary.create({
        data: {
          hostId: candidato.receiverId,
          day: dia,
          level: nivel.nivel,
          luckyCoins,
          liveSeconds: progreso.liveSeconds,
          diamonds: nivel.salario,
        },
      });

      await tx.transaction.create({
        data: {
          userId: candidato.receiverId,
          type: TRANSACTION_TYPE.SALARY,
          currency: CURRENCY.DIAMONDS,
          amount: nivel.salario,
          balanceAfter: usuario.diamonds,
          reference: `salary:${dia}`,
        },
      });

      return usuario;
    });

    emitToUser(candidato.receiverId, SOCKET_EVENTS.WALLET_UPDATED, wallet);
    pagados.push({ hostId: candidato.receiverId, nivel: nivel.nivel, diamantes: nivel.salario });
  }

  return { dia, pagados };
}
