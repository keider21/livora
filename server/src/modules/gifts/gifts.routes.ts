import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendGiftSchema } from './gifts.schema';
import * as giftsService from './gifts.service';

export const giftsRouter = Router();

giftsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await giftsService.listGifts());
  }),
);

giftsRouter.post(
  '/send',
  requireAuth,
  validate(sendGiftSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await giftsService.sendGift(req.userId!, req.body));
  }),
);

giftsRouter.get(
  '/room/:roomId',
  asyncHandler(async (req, res) => {
    res.json(await giftsService.roomGiftHistory(req.params.roomId));
  }),
);
