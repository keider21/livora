import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { requireAuth } from '../../middleware/auth';
import { diaDe } from '../../lib/salary';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { CUENTAS_DE_PRUEBA, reiniciarDatos } from '../../lib/reset';
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
    const usuario = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { username: true },
    });
    if (!usuario || !CUENTAS_DE_PRUEBA.has(usuario.username)) {
      throw HttpError.forbidden('Esto solo lo puede hacer la cuenta de pruebas');
    }

    const resumen = await reiniciarDatos();
    res.json({ resumen });
  }),
);
