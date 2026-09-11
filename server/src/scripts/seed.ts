import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { GIFT_CATALOG } from '../lib/gift-catalog';
import { seedRooms } from './seed-rooms';

/**
 * Cuentas de prueba.
 *
 * Las fotos son retratos de un servicio público de datos de prueba, elegidos a
 * mano para que peguen con el nombre y el género. Con caricaturas la sala no
 * parecía una sala: una rejilla de invitados con monigotes no se puede mirar y
 * decidir si funciona, y eso es justo lo que hay que poder probar.
 */
const USERS = [
  { username: 'luna', displayName: 'Luna Ríos', country: 'CO', gender: 'female', bio: 'Canto cada noche a las 9 ✨', foto: 'women/44' },
  { username: 'dani', displayName: 'Dani Beat', country: 'MX', gender: 'male', bio: 'Productor y DJ', foto: 'men/32' },
  { username: 'sofi', displayName: 'Sofi Dance', country: 'AR', gender: 'female', bio: 'Bailando salsa y bachata', foto: 'women/68' },
  { username: 'marco', displayName: 'Marco Gamer', country: 'ES', gender: 'male', bio: 'Retos y gameplay', foto: 'men/75' },
  { username: 'keider', displayName: 'Keider', country: 'CO', gender: 'unspecified', bio: 'Probando Livora Stream', foto: 'men/11' },
];

async function main() {
  console.log('[seed] Cargando catálogo de regalos...');
  for (const gift of GIFT_CATALOG) {
    await prisma.gift.upsert({ where: { code: gift.code }, create: gift, update: gift });
  }

  console.log('[seed] Creando usuarios de prueba (contraseña: livora123)...');
  const passwordHash = await bcrypt.hash('livora123', 10);
  for (const { foto, ...user } of USERS) {
    const avatarUrl = `https://randomuser.me/api/portraits/${foto}.jpg`;
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
        ...user,
        email: `${user.username}@livora.test`,
        passwordHash,
        coins: 5000,
        diamonds: 0,
        avatarUrl,
      },
      // El seed manda sobre las cuentas de prueba: si cambia la contraseña o el
      // avatar de referencia, volver a ejecutarlo las pone al día.
      update: { ...user, passwordHash, avatarUrl },
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
