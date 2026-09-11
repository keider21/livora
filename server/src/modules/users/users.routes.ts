import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as usersService from './users.service';
import { guardarImagen } from './uploads.service';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(32).optional(),
  bio: z.string().max(160).optional(),
  // Se acepta tanto una dirección completa como la ruta de una foto ya subida.
  avatarUrl: z.string().max(300).optional(),
  country: z.string().length(2).optional(),
  /** Una línea de estado, aparte de la biografía. */
  status: z.string().max(60).optional(),
});

const avatarSchema = z.object({
  /** La imagen en `data:image/jpeg;base64,...`. */
  image: z.string().min(32),
});

export const usersRouter = Router();

usersRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const term = String(req.query.q ?? '').trim();
    if (term.length < 2) {
      res.json({ users: [] });
      return;
    }
    res.json(await usersService.search(term));
  }),
);

usersRouter.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    res.json(await usersService.updateProfile(req.userId!, req.body));
  }),
);

/**
 * Sube la foto de perfil y la deja puesta.
 *
 * Devuelve el usuario ya actualizado para que la app no tenga que pedirlo otra
 * vez: subir la foto y verla puesta es un solo gesto para quien lo hace.
 */
usersRouter.post(
  '/me/avatar',
  requireAuth,
  validate(avatarSchema),
  asyncHandler(async (req, res) => {
    const avatarUrl = await guardarImagen(req.body.image, `avatar-${req.userId}`);
    res.json(await usersService.updateProfile(req.userId!, { avatarUrl }));
  }),
);

usersRouter.get(
  '/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    res.json(await usersService.getProfile(req.params.username, req.userId));
  }),
);

usersRouter.get(
  '/:username/followers',
  asyncHandler(async (req, res) => {
    res.json(await usersService.listFollowers(req.params.username));
  }),
);

usersRouter.get(
  '/:username/following',
  asyncHandler(async (req, res) => {
    res.json(await usersService.listFollowing(req.params.username));
  }),
);

usersRouter.get(
  '/:username/streams',
  asyncHandler(async (req, res) => {
    res.json(await usersService.listStreams(req.params.username));
  }),
);

usersRouter.post(
  '/:username/follow',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await usersService.follow(req.userId!, req.params.username));
  }),
);

usersRouter.delete(
  '/:username/follow',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await usersService.unfollow(req.userId!, req.params.username));
  }),
);
