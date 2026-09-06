import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as usersService from './users.service';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(32).optional(),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().optional(),
  country: z.string().length(2).optional(),
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
