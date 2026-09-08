import { prisma } from './prisma';
import { seedRooms } from '../scripts/seed-rooms';

const MONEDAS_DE_BIENVENIDA = 5_000;

/**
 * Cuentas que pueden reiniciar los datos desde la app.
 *
 * Es una lista corta y escrita a mano a propósito: el reinicio borra lo
 * acumulado de **todo el mundo**, así que no puede depender de un permiso que
 * alguien pueda ganarse. Mientras la app esté en pruebas esto vale; cuando haya
 * usuarios de verdad, esta ruta se quita entera.
 */
export const CUENTAS_DE_PRUEBA = new Set(['luna']);

/**
 * Pone a cero lo acumulado, para volver a probar una mecánica desde el
 * principio: regalos enviados, salarios pagados, movimientos del monedero,
 * mensajes, transmisiones e invitados de la tira. Cada cuenta se queda con el
 * saldo de bienvenida.
 *
 * **No borra las cuentas**: quien esté probando en un teléfono sigue con su
 * sesión abierta y no tiene que volver a entrar. Por eso son borrados dirigidos
 * y no un vaciado de la base: el resultado es el mismo y así no se pierde el
 * esquema ni las sesiones, que es lo que obliga a reconfigurar los teléfonos.
 */
export async function reiniciarDatos() {
  // El orden importa: primero lo que apunta a otras tablas.
  const [regalos, salarios, movimientos, mensajes, asientos] = await Promise.all([
    prisma.giftSend.deleteMany(),
    prisma.hostSalary.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.message.deleteMany(),
    prisma.roomSeat.deleteMany(),
  ]);
  const salas = await prisma.room.deleteMany();

  const cuentas = await prisma.user.updateMany({
    data: { coins: MONEDAS_DE_BIENVENIDA, diamonds: 0, xp: 0, level: 1, isHost: false },
  });

  await seedRooms();

  return {
    regalos: regalos.count,
    salarios: salarios.count,
    movimientos: movimientos.count,
    mensajes: mensajes.count,
    asientos: asientos.count,
    salas: salas.count,
    cuentas: cuentas.count,
    monedas: MONEDAS_DE_BIENVENIDA,
  };
}
