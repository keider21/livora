import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { requireAuth } from '../../middleware/auth';
import { diaDe } from '../../lib/salary';
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
