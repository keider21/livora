import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { CURRENCY, TRANSACTION_TYPE } from '../../lib/constants';
import { COFRES, abrirCofre, cofrePorCodigo, probabilidadDePremio, retornoDelCofre } from '../../lib/chests';
import { emitToUser } from '../../realtime/bus';
import { SOCKET_EVENTS } from '../../realtime/events';

/** Catálogo con lo que hace falta para pintarlo: precio y premios posibles. */
export function listarCofres() {
  return {
    cofres: COFRES.map((cofre) => ({
      code: cofre.code,
      nombre: cofre.nombre,
      emoji: cofre.emoji,
      precio: cofre.precio,
      premios: cofre.premios.map((premio) => premio.monedas),
      /** Probabilidad de que devuelva algo, para enseñarla sin engaños. */
      probabilidad: probabilidadDePremio(cofre),
    })),
  };
}

/**
 * Abre uno o varios cofres del mismo tipo.
 *
 * Cada uno se sortea por separado, igual que las unidades de un regalo: abrir
 * diez de golpe son diez tiradas, no una multiplicada.
 *
 * El cobro y el premio van en la misma transacción, así que el saldo que vuelve
 * ya lo incluye y nunca se ve un estado a medias.
 */
export async function abrir(userId: string, code: string, cantidad: number) {
  const cofre = cofrePorCodigo(code);
  if (!cofre) throw HttpError.notFound('Ese cofre no existe');

  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
  if (!usuario) throw HttpError.unauthorized();

  const coste = cofre.precio * cantidad;
  if (usuario.coins < coste) throw HttpError.paymentRequired('No tienes monedas suficientes');

  const premios = Array.from({ length: cantidad }, () => abrirCofre(cofre));
  const ganado = premios.reduce((total, premio) => total + premio, 0);

  const wallet = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: coste - ganado } },
      select: { coins: true, diamonds: true },
    });

    await tx.transaction.createMany({
      data: [
        {
          userId,
          type: TRANSACTION_TYPE.CHEST_OPEN,
          currency: CURRENCY.COINS,
          amount: -coste,
          balanceAfter: actualizado.coins + ganado,
          reference: `chest:${cofre.code}`,
        },
        // El premio va aparte para que el historial explique de dónde salieron
        // las monedas, igual que con los regalos.
        ...(ganado > 0
          ? [
              {
                userId,
                type: TRANSACTION_TYPE.CHEST_PRIZE,
                currency: CURRENCY.COINS,
                amount: ganado,
                balanceAfter: actualizado.coins,
                reference: `chest:${cofre.code}`,
              },
            ]
          : []),
      ],
    });

    return actualizado;
  });

  emitToUser(userId, SOCKET_EVENTS.WALLET_UPDATED, wallet);

  return {
    cofre: { code: cofre.code, nombre: cofre.nombre, emoji: cofre.emoji },
    cantidad,
    coste,
    /** Lo que salió en cada uno, en orden; 0 es «nada». */
    premios,
    ganado,
    /** El mejor de la tanda, que es lo que se enseña en grande. */
    mejor: premios.length > 0 ? Math.max(...premios) : 0,
    wallet,
  };
}

/** Para las pruebas y para documentar: lo que devuelve cada cofre de media. */
export function retornos() {
  return COFRES.map((cofre) => ({ code: cofre.code, retorno: retornoDelCofre(cofre) }));
}
