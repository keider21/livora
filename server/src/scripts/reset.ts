/**
 * Pone a cero lo acumulado, para volver a probar una mecánica desde el principio.
 *
 *   npm run reset        (desde server/)
 *
 * La cuenta de pruebas puede hacer lo mismo desde su perfil en la app, que es
 * más rápido cuando se está probando con el teléfono en la mano. Lo que borra y
 * lo que respeta está explicado en `lib/reset.ts`.
 */
import { prisma } from '../lib/prisma';
import { reiniciarDatos } from '../lib/reset';

async function main() {
  console.log('[reset] Borrando lo acumulado...');
  const r = await reiniciarDatos();

  console.log(
    `[reset] ${r.regalos} regalos, ${r.salarios} salarios, ${r.movimientos} movimientos, ` +
      `${r.mensajes} mensajes, ${r.asientos} asientos y ${r.salas} transmisiones`,
  );
  console.log(`[reset] ${r.cuentas} cuentas con ${r.monedas.toLocaleString('es')} monedas y 0 diamantes`);
  console.log('[reset] Listo: metas, diamantes y regalos a cero');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
