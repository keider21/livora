import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { CURRENCY, TRANSACTION_TYPE } from '../../lib/constants';
import { progresoDelDia } from '../hosts/salary.service';

/**
 * Agencias: quien capta y forma anfitriones, y cobra por lo que generan.
 *
 * Es el motor de crecimiento de estas apps. Una agencia busca gente, la enseña a
 * transmitir y la mantiene activa, y lo hace porque cobra de lo que produzcan
 * los suyos. Sin eso, captar anfitriones lo tiene que hacer la propia
 * plataforma, que es mucho más caro y no escala.
 *
 * ## De dónde sale la comisión
 *
 * **Del margen de la casa, no del bolsillo del anfitrión.** Un anfitrión con
 * agencia cobra exactamente lo mismo que uno sin ella; si no fuera así, entrar
 * en una agencia sería un castigo y nadie entraría, que es justo lo contrario de
 * lo que se busca.
 *
 * En números: los anfitriones se llevan alrededor del 40% de cada moneda
 * consumida, así que una comisión del 10% sobre lo que ganan son 4 puntos de los
 * 60 que quedaban. Subir la comisión es barato de escribir y caro de sostener;
 * el simulador (`npm run simular`) dice cuánto queda después.
 */

/** Comisión por defecto: la parte de lo que gana el anfitrión que se lleva quien lo captó. */
export const COMISION_POR_DEFECTO = 0.1;

/** Tope de la comisión. Por encima, la casa deja de cubrir el resto de gastos. */
export const COMISION_MAXIMA = 0.3;

/**
 * Código para compartir. Se evitan las letras y cifras que se confunden al
 * dictarlo por voz o copiarlo de una captura: O/0, I/1, L.
 */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function codigoNuevo(): string {
  let codigo = '';
  for (let i = 0; i < 6; i += 1) codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return codigo;
}

/** Crea una agencia y deja a quien la crea como dueño. */
export async function crearAgencia(ownerId: string, name: string, rate = COMISION_POR_DEFECTO) {
  if (rate <= 0 || rate > COMISION_MAXIMA) {
    throw HttpError.badRequest(`La comisión tiene que estar entre 0 y ${COMISION_MAXIMA * 100}%`);
  }

  const yaTiene = await prisma.agency.findFirst({ where: { ownerId }, select: { id: true } });
  if (yaTiene) throw HttpError.conflict('Ya tienes una agencia');

  // El código es único en la tabla; si sale repetido se prueba otro en vez de
  // fallar, que con seis caracteres pasa una vez entre muchísimas.
  for (let intento = 0; intento < 5; intento += 1) {
    const code = codigoNuevo();
    const libre = await prisma.agency.findUnique({ where: { code }, select: { id: true } });
    if (libre) continue;
    return prisma.agency.create({ data: { name, code, ownerId, rate } });
  }

  throw HttpError.conflict('No se pudo generar un código, inténtalo otra vez');
}

/** Un anfitrión se une a una agencia con su código. */
export async function unirseAAgencia(userId: string, code: string) {
  const agencia = await prisma.agency.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!agencia) throw HttpError.notFound('Ese código no existe');
  if (agencia.ownerId === userId) throw HttpError.badRequest('No puedes ser anfitrión de tu propia agencia');

  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { agencyId: true } });
  if (usuario?.agencyId === agencia.id) throw HttpError.conflict('Ya estás en esta agencia');
  if (usuario?.agencyId) throw HttpError.conflict('Ya estás en otra agencia: sal de ella primero');

  await prisma.user.update({ where: { id: userId }, data: { agencyId: agencia.id } });
  return { agencia: { id: agencia.id, name: agencia.name, rate: agencia.rate } };
}

/** Salir de la agencia. Lo ya cobrado se queda cobrado. */
export async function salirDeAgencia(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { agencyId: null } });
  return { ok: true };
}

/**
 * Paga a la agencia del anfitrión su parte de lo que acaba de ganar.
 *
 * Se llama **dentro de la misma transacción** que el pago al anfitrión: si una
 * de las dos cosas falla no puede quedar la otra hecha, o las cuentas de la
 * agencia dejarían de cuadrar con las del anfitrión.
 *
 * Devuelve lo pagado, o 0 si el anfitrión no tiene agencia o la comisión no
 * llega ni a un diamante.
 */
export async function pagarComision(
  tx: Prisma.TransactionClient,
  hostId: string,
  diamantesDelAnfitrion: number,
  source: 'gift' | 'salary',
): Promise<number> {
  if (diamantesDelAnfitrion <= 0) return 0;

  const host = await tx.user.findUnique({ where: { id: hostId }, select: { agencyId: true } });
  if (!host?.agencyId) return 0;

  const agencia = await tx.agency.findUnique({
    where: { id: host.agencyId },
    select: { id: true, ownerId: true, rate: true },
  });
  if (!agencia) return 0;

  const comision = Math.round(diamantesDelAnfitrion * agencia.rate);
  if (comision <= 0) return 0;

  const dueño = await tx.user.update({
    where: { id: agencia.ownerId },
    data: { diamonds: { increment: comision } },
    select: { diamonds: true },
  });

  await tx.agencyPayout.create({
    data: {
      agencyId: agencia.id,
      hostId,
      diamonds: comision,
      source,
      base: diamantesDelAnfitrion,
    },
  });

  await tx.transaction.create({
    data: {
      userId: agencia.ownerId,
      type: TRANSACTION_TYPE.AGENCY_COMMISSION,
      currency: CURRENCY.DIAMONDS,
      amount: comision,
      balanceAfter: dueño.diamonds,
      reference: `agency:${agencia.id}`,
    },
  });

  return comision;
}

/**
 * El panel de la agencia: quién está dentro, cuánto lleva hoy y cómo va de meta.
 *
 * No basta con lo que han generado desde siempre. Lo que decide el trabajo de
 * una agencia es **hoy**: quién va corto de horas y no va a cobrar por mucho que
 * le regalen, y a quién le falta poco para el siguiente escalón y merece un
 * empujón. Sin esas dos cifras, el panel dice quién fue bueno el mes pasado y
 * no qué hacer esta tarde.
 *
 * El progreso de cada anfitrión se pide por separado porque sale de sus regalos
 * y sus transmisiones, no de una columna guardada. Con agencias grandes eso son
 * muchas consultas, así que van en paralelo y limitadas a los que están dentro.
 */
export async function panelDeAgencia(ownerId: string) {
  const agencia = await prisma.agency.findFirst({ where: { ownerId } });
  if (!agencia) return { agencia: null };

  const [hosts, porHost, total] = await Promise.all([
    prisma.user.findMany({
      where: { agencyId: agencia.id },
      select: { id: true, username: true, displayName: true, avatarUrl: true, diamonds: true, createdAt: true },
    }),
    prisma.agencyPayout.groupBy({
      by: ['hostId'],
      where: { agencyId: agencia.id },
      _sum: { diamonds: true, base: true },
    }),
    prisma.agencyPayout.aggregate({ where: { agencyId: agencia.id }, _sum: { diamonds: true } }),
  ]);

  const porId = new Map(porHost.map((fila) => [fila.hostId, fila]));

  // El día de cada uno: lo que lleva de meta y de horas en directo.
  const hoy = await Promise.all(
    hosts.map(async (host) => [host.id, await progresoDelDia(host.id)] as const),
  );
  const delDia = new Map(hoy);

  return {
    agencia: {
      id: agencia.id,
      name: agencia.name,
      code: agencia.code,
      rate: agencia.rate,
      /** Lo cobrado desde siempre, en diamantes. */
      cobrado: total._sum.diamonds ?? 0,
    },
    hosts: hosts
      .map((host) => {
        const dia = delDia.get(host.id);
        return {
          ...host,
          /** Lo que ha ganado el anfitrión y sobre lo que se cobró comisión. */
          generado: porId.get(host.id)?._sum.base ?? 0,
          comision: porId.get(host.id)?._sum.diamonds ?? 0,
          /** Cómo va hoy: es lo que dice si hay que hacer algo con esta persona. */
          hoy: {
            luckyCoins: dia?.luckyCoins ?? 0,
            nivel: dia?.nivel ?? 0,
            siguiente: dia?.siguiente ?? null,
            liveSeconds: dia?.liveSeconds ?? 0,
            segundosMinimos: dia?.segundosMinimos ?? 0,
            cumpleHoras: dia?.cumpleHoras ?? false,
            salarioEstimado: dia?.salarioEstimado ?? 0,
          },
        };
      })
      // Primero quien más lleva hoy: es a quien hay que acompañar ahora.
      .sort((a, b) => b.hoy.luckyCoins - a.hoy.luckyCoins || b.generado - a.generado),
  };
}

/** La agencia a la que pertenece un anfitrión, para su propia pantalla. */
export async function miAgencia(userId: string) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { agency: { select: { id: true, name: true, code: true, rate: true } } },
  });
  if (!usuario?.agency) return { agencia: null, aportado: 0 };

  const aportado = await prisma.agencyPayout.aggregate({
    where: { hostId: userId },
    _sum: { base: true },
  });

  return { agencia: usuario.agency, aportado: aportado._sum.base ?? 0 };
}
