import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendGiftSchema } from './gifts.schema';
import * as giftsService from './gifts.service';

export const giftsRouter = Router();

// Con `roomId` y sesión, la respuesta trae también el nivel de club de fans
// que tiene quien pregunta con ese anfitrión.
giftsRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : undefined;
    res.json(await giftsService.listGifts(req.userId, roomId));
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
