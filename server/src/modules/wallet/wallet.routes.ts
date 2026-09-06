import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as walletService from './wallet.service';

const topUpSchema = z.object({ packageId: z.string().min(1) });
const exchangeSchema = z.object({ diamonds: z.number().int().min(1) });

export const walletRouter = Router();

walletRouter.use(requireAuth);

walletRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await walletService.getWallet(req.userId!));
  }),
);

walletRouter.post(
  '/topup',
  validate(topUpSchema),
  asyncHandler(async (req, res) => {
    res.json(await walletService.topUp(req.userId!, req.body.packageId));
  }),
);

walletRouter.post(
  '/exchange',
  validate(exchangeSchema),
  asyncHandler(async (req, res) => {
    res.json(await walletService.exchangeDiamonds(req.userId!, req.body.diamonds));
  }),
);

walletRouter.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    res.json(await walletService.listTransactions(req.userId!));
  }),
);
