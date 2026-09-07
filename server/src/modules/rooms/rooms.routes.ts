import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRoomSchema, listRoomsSchema, seatMicSchema, sendMessageSchema } from './rooms.schema';
import * as roomsService from './rooms.service';
import * as seatsService from './seats.service';

export const roomsRouter = Router();

roomsRouter.get(
  '/',
  validate(listRoomsSchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await roomsService.listRooms(listRoomsSchema.parse(req.query)));
  }),
);

roomsRouter.post(
  '/',
  requireAuth,
  validate(createRoomSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await roomsService.createRoom(req.userId!, req.body));
  }),
);

roomsRouter.get(
  '/:roomId',
  optionalAuth,
  asyncHandler(async (req, res) => {
    res.json(await roomsService.getRoom(req.params.roomId, req.userId));
  }),
);

roomsRouter.post(
  '/:roomId/join',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await roomsService.joinRoom(req.params.roomId, req.userId!));
  }),
);

roomsRouter.post(
  '/:roomId/end',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await roomsService.endRoom(req.params.roomId, req.userId!));
  }),
);

roomsRouter.get(
  '/:roomId/messages',
  asyncHandler(async (req, res) => {
    res.json({ messages: await roomsService.recentMessages(req.params.roomId) });
  }),
);

roomsRouter.post(
  '/:roomId/messages',
  requireAuth,
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({
      message: await roomsService.postMessage(req.params.roomId, req.userId!, req.body.body),
    });
  }),
);

roomsRouter.post(
  '/:roomId/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await roomsService.likeRoom(req.params.roomId));
  }),
);

// --- Invitados de la tira lateral ---

roomsRouter.get(
  '/:roomId/seats',
  asyncHandler(async (req, res) => {
    res.json(await seatsService.listSeats(req.params.roomId));
  }),
);

/** Un espectador pide subir. */
roomsRouter.post(
  '/:roomId/seats/request',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.status(201).json(await seatsService.requestSeat(req.params.roomId, req.userId!));
  }),
);

/** El anfitrión acepta a alguien y le devuelve credenciales de solo voz. */
roomsRouter.post(
  '/:roomId/seats/:userId/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await seatsService.acceptSeat(req.params.roomId, req.userId!, req.params.userId));
  }),
);

/** Bajar a alguien, o rechazar su solicitud. */
roomsRouter.delete(
  '/:roomId/seats/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await seatsService.leaveSeat(req.params.roomId, req.userId!, req.params.userId));
  }),
);

roomsRouter.patch(
  '/:roomId/seats/:userId/mic',
  requireAuth,
  validate(seatMicSchema),
  asyncHandler(async (req, res) => {
    res.json(await seatsService.setSeatMic(req.params.roomId, req.userId!, req.params.userId, req.body.micMuted));
  }),
);
