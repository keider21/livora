import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { roomsRouter } from './modules/rooms/rooms.routes';
import { giftsRouter } from './modules/gifts/gifts.routes';
import { walletRouter } from './modules/wallet/wallet.routes';
import { hostsRouter } from './modules/hosts/hosts.routes';
import { chestsRouter } from './modules/chests/chests.routes';
import { rankingRouter } from './modules/ranking/ranking.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.includes('*') ? true : env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'livora-api', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/gifts', giftsRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/hosts', hostsRouter);
  app.use('/api/chests', chestsRouter);
  app.use('/api/ranking', rankingRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
