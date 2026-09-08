/**
 * Pone a cero lo acumulado, para volver a probar una mecánica desde el principio.
 *
 *   npm run reset        (desde server/)
 *
 * Borra los regalos enviados, los salarios pagados, los movimientos del
 * monedero, los mensajes, las transmisiones y los invitados de la tira, y deja
 * cada cuenta con el saldo de bienvenida. **No borra las cuentas**: quien esté
 * probando en un teléfono sigue con su sesión abierta y no tiene que volver a
 * entrar.
 *
 * Se hace con borrados dirigidos en vez de tirar la base entera a propósito. El
 * resultado es el mismo y así no se pierde el esquema ni las sesiones, que es lo
 * que obliga a reconfigurar los teléfonos.
 */
import { prisma } from '../lib/prisma';
import { seedRooms } from './seed-rooms';

const MONEDAS_DE_BIENVENIDA = 5_000;

async function main() {
  console.log('[reset] Borrando lo acumulado...');

  // El orden importa: primero lo que apunta a otras tablas.
  const [regalos, salarios, movimientos, mensajes, asientos] = await Promise.all([
    prisma.giftSend.deleteMany(),
    prisma.hostSalary.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.message.deleteMany(),
    prisma.roomSeat.deleteMany(),
  ]);
  const salas = await prisma.room.deleteMany();

  console.log(
    `[reset] ${regalos.count} regalos, ${salarios.count} salarios, ${movimientos.count} movimientos, ` +
      `${mensajes.count} mensajes, ${asientos.count} asientos y ${salas.count} transmisiones`,
  );

  const cuentas = await prisma.user.updateMany({
    data: { coins: MONEDAS_DE_BIENVENIDA, diamonds: 0, xp: 0, level: 1, isHost: false },
  });
  console.log(`[reset] ${cuentas.count} cuentas con ${MONEDAS_DE_BIENVENIDA.toLocaleString('es')} monedas y 0 diamantes`);

  await seedRooms();
  console.log('[reset] Listo: metas, diamantes y regalos a cero');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
