import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { GIFT_CATALOG } from '../lib/gift-catalog';
import { seedRooms } from './seed-rooms';

const USERS = [
  { username: 'luna', displayName: 'Luna Ríos', country: 'CO', gender: 'female', bio: 'Canto cada noche a las 9 ✨' },
  { username: 'dani', displayName: 'Dani Beat', country: 'MX', gender: 'male', bio: 'Productor y DJ' },
  { username: 'sofi', displayName: 'Sofi Dance', country: 'AR', gender: 'female', bio: 'Bailando salsa y bachata' },
  { username: 'marco', displayName: 'Marco Gamer', country: 'ES', gender: 'male', bio: 'Retos y gameplay' },
  { username: 'keider', displayName: 'Keider', country: 'CO', gender: 'unspecified', bio: 'Probando Livora Stream' },
];

async function main() {
  console.log('[seed] Cargando catálogo de regalos...');
  for (const gift of GIFT_CATALOG) {
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

  await seedRooms();

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
