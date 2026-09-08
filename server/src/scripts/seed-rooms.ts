import { prisma } from '../lib/prisma';
import { streamProvider } from '../streaming';

const ROOMS = [
  { host: 'luna', title: 'Noche acústica 🎤', category: 'music' },
  { host: 'sofi', title: 'Clase de bachata en vivo', category: 'dance' },
  { host: 'marco', title: 'Ranked hasta diamante', category: 'game' },
];

/**
 * Abre las transmisiones de ejemplo.
 *
 * Vive en su propio archivo porque lo usan el sembrado y el reinicio de datos, y
 * `seed.ts` lanza el sembrado entero nada más importarlo: sacarlo de ahí evita
 * que pedir solo las salas acabe recreando usuarios y regalos.
 */
export async function seedRooms(): Promise<void> {
  console.log('[seed] Abriendo transmisiones de ejemplo...');
  for (const room of ROOMS) {
    const host = await prisma.user.findUniqueOrThrow({ where: { username: room.host } });
    const existing = await prisma.room.findFirst({ where: { hostId: host.id, status: 'live' } });
    if (existing) continue;

    const id = crypto.randomUUID();
    await prisma.room.create({
      data: {
        id,
        hostId: host.id,
        title: room.title,
        category: room.category,
        channel: await streamProvider.createChannel(id),
        viewerCount: Math.floor(Math.random() * 400) + 20,
      },
    });
    await prisma.user.update({ where: { id: host.id }, data: { isHost: true } });
  }
}
