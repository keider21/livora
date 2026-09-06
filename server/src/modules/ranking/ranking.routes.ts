import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import * as rankingService from './ranking.service';
import type { RankingPeriod } from './ranking.service';

const PERIODS: RankingPeriod[] = ['day', 'week', 'all'];

function readPeriod(value: unknown): RankingPeriod {
  return PERIODS.includes(value as RankingPeriod) ? (value as RankingPeriod) : 'week';
}

export const rankingRouter = Router();

rankingRouter.get(
  '/hosts',
  asyncHandler(async (req, res) => {
    res.json(await rankingService.topHosts(readPeriod(req.query.period)));
  }),
);

rankingRouter.get(
  '/senders',
  asyncHandler(async (req, res) => {
    res.json(await rankingService.topSenders(readPeriod(req.query.period)));
  }),
);
