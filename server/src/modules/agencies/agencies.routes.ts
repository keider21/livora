import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createAgencySchema, joinAgencySchema } from './agencies.schema';
import * as agencies from './agencies.service';

export const agenciesRouter = Router();

/** La agencia que tengo como dueño, con sus anfitriones y lo cobrado. */
agenciesRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await agencies.panelDeAgencia(req.userId!));
  }),
);

/** La agencia a la que pertenezco como anfitrión. */
agenciesRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await agencies.miAgencia(req.userId!));
  }),
);

agenciesRouter.post(
  '/',
  requireAuth,
  validate(createAgencySchema),
  asyncHandler(async (req, res) => {
    const agencia = await agencies.crearAgencia(req.userId!, req.body.name, req.body.rate);
    res.status(201).json({ agencia });
  }),
);

agenciesRouter.post(
  '/join',
  requireAuth,
  validate(joinAgencySchema),
  asyncHandler(async (req, res) => {
    res.json(await agencies.unirseAAgencia(req.userId!, req.body.code));
  }),
);

agenciesRouter.post(
  '/leave',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await agencies.salirDeAgencia(req.userId!));
  }),
);
