import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { streamProvider } from '../streaming';

const GIFTS = [
  { code: 'rose', name: 'Rosa', emoji: '🌹', priceCoins: 10, tier: 'basic', animation: 'float' },
  { code: 'heart', name: 'Corazón', emoji: '💖', priceCoins: 25, tier: 'basic', animation: 'float' },
  { code: 'beer', name: 'Cerveza', emoji: '🍺', priceCoins: 50, tier: 'basic', animation: 'float' },
  { code: 'crown', name: 'Corona', emoji: '👑', priceCoins: 199, tier: 'rare', animation: 'burst' },
  { code: 'fireworks', name: 'Fuegos artificiales', emoji: '🎆', priceCoins: 499, tier: 'rare', animation: 'burst' },
  { code: 'ferrari', name: 'Deportivo', emoji: '🏎️', priceCoins: 1299, tier: 'epic', animation: 'fullscreen' },
  { code: 'yacht', name: 'Yate', emoji: '🛥️', priceCoins: 2999, tier: 'epic', animation: 'fullscreen' },
  { code: 'castle', name: 'Castillo', emoji: '🏰', priceCoins: 9999, tier: 'legendary', animation: 'fullscreen' },
];

const USERS = [
  { username: 'luna', displayName: 'Luna Ríos', country: 'CO', gender: 'female', bio: 'Canto cada noche a las 9 ✨' },
  { username: 'dani', displayName: 'Dani Beat', country: 'MX', gender: 'male', bio: 'Productor y DJ' },
  { username: 'sofi', displayName: 'Sofi Dance', country: 'AR', gender: 'female', bio: 'Bailando salsa y bachata' },
  { username: 'marco', displayName: 'Marco Gamer', country: 'ES', gender: 'male', bio: 'Retos y gameplay' },
  { username: 'keider', displayName: 'Keider', country: 'CO', gender: 'unspecified', bio: 'Probando Livora Stream' },
];

const ROOMS = [
  { host: 'luna', title: 'Noche acústica 🎤', category: 'music' },
  { host: 'sofi', title: 'Clase de bachata en vivo', category: 'dance' },
  { host: 'marco', title: 'Ranked hasta diamante', category: 'game' },
];

async function main() {
  console.log('[seed] Cargando catálogo de regalos...');
  for (const gift of GIFTS) {
    await prisma.gift.upsert({ where: { code: gift.code }, create: gift, update: gift });
  }

  console.log('[seed] Creando usuarios de prueba (contraseña: livora123)...');
  const passwordHash = await bcrypt.hash('livora123', 10);
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
        ...user,
        email: `${user.username}@livora.test`,
        passwordHash,
        coins: 5000,
        diamonds: 0,
        avatarUrl: `https://api.dicebear.com/9.x/adventurer/png?seed=${user.username}`,
      },
      // El seed manda sobre las cuentas de prueba: si cambia la contraseña o el
      // avatar de referencia, volver a ejecutarlo las pone al día.
      update: { ...user, passwordHash },
    });
  }

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

  const [users, rooms, gifts] = await Promise.all([
    prisma.user.count(),
    prisma.room.count(),
    prisma.gift.count(),
  ]);
  console.log(`[seed] Listo. ${users} usuarios, ${rooms} salas, ${gifts} regalos.`);
}

main()
  .catch((error) => {
    console.error('[seed] Falló:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
