import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { requireAuth } from '../../middleware/auth';
import { diaDe } from '../../lib/salary';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { CUENTAS_DE_PRUEBA, reiniciarDatos } from '../../lib/reset';
import { estadisticasDeLaPlataforma } from './stats.service';
import { auditarCuentas, cambiarBaneo, historialDe, saludDelJuego } from './audit.service';
import * as salary from './salary.service';

export const hostsRouter = Router();

/** Progreso de hoy hacia la meta de salario, y lo cobrado los días anteriores. */
hostsRouter.get(
  '/me/salary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const dia = typeof req.query.day === 'string' ? req.query.day : diaDe();
    const [progreso, historial] = await Promise.all([
      salary.progresoDelDia(req.userId!, dia),
      salary.historialDeSalario(req.userId!),
    ]);
    res.json({ progreso, historial });
  }),
);

/**
 * Reinicio de datos desde la app, solo para la cuenta de pruebas.
 *
 * Existe porque probar la meta obliga a volver a cero muchas veces al día y
 * hacerlo desde la consola rompe el ritmo de la prueba. Borra lo acumulado de
 * **todos**, así que la puerta es una lista de usuarios escrita a mano y no un
 * permiso: ver `lib/reset.ts`. Sale de aquí en cuanto la app deje de ser una
 * prueba.
 */
hostsRouter.post(
  '/me/reset',
  requireAuth,
  asyncHandler(async (req, res) => {
    await exigirCuentaDePrueba(req.userId!);
    const resumen = await reiniciarDatos();
    res.json({ resumen });
  }),
);

/**
 * Cómo va de dinero la aplicación: lo que entró por recargas contra lo que se
 * debe en diamantes. Es información del negocio entero, no de una cuenta, así
 * que pasa por la misma puerta que el reinicio.
 */
hostsRouter.get(
  '/me/stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    await exigirCuentaDePrueba(req.userId!);
    res.json(await estadisticasDeLaPlataforma());
  }),
);

/**
 * Vigilancia: cuentas cuyo saldo no cuadra con sus movimientos, y si el juego
 * está pagando más de lo previsto.
 */
hostsRouter.get(
  '/me/audit',
  requireAuth,
  asyncHandler(async (req, res) => {
    await exigirCuentaDePrueba(req.userId!);
    const [cuentas, juego] = await Promise.all([auditarCuentas(), saludDelJuego()]);
    res.json({ ...cuentas, juego });
  }),
);

/** Los movimientos de una cuenta, para ver de dónde salió cada moneda. */
hostsRouter.get(
  '/me/audit/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await exigirCuentaDePrueba(req.userId!);
    res.json(await historialDe(req.params.userId!));
  }),
);

/** Corta o devuelve el acceso a una cuenta. */
hostsRouter.post(
  '/me/audit/:userId/ban',
  requireAuth,
  asyncHandler(async (req, res) => {
    await exigirCuentaDePrueba(req.userId!);
    const banear = req.body?.banear !== false;
    res.json(await cambiarBaneo(req.params.userId!, banear));
  }),
);

async function exigirCuentaDePrueba(userId: string) {
  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (!usuario || !CUENTAS_DE_PRUEBA.has(usuario.username)) {
    throw HttpError.forbidden('Esto solo lo puede hacer la cuenta de pruebas');
  }
}
