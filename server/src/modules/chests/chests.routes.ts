import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { abrirCofreSchema } from './chests.schema';
import * as chests from './chests.service';

export const chestsRouter = Router();

chestsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(chests.listarCofres());
  }),
);

chestsRouter.post(
  '/open',
  requireAuth,
  validate(abrirCofreSchema),
  asyncHandler(async (req, res) => {
    res.json(await chests.abrir(req.userId!, req.body.code, req.body.cantidad));
  }),
);
