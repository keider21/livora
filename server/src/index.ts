import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { createSocketServer } from './realtime/socket';
import { disconnectPrisma } from './lib/prisma';
import { streamProvider } from './streaming';
import { iniciarLiquidacionDeSalarios } from './modules/hosts/salary.scheduler';

const app = createApp();
const httpServer = createServer(app);
createSocketServer(httpServer);

const detenerSalarios = iniciarLiquidacionDeSalarios();

httpServer.listen(env.port, () => {
  console.log(`[livora] API y WebSocket escuchando en http://localhost:${env.port}`);
  console.log(`[livora] Proveedor de streaming: ${streamProvider.name}`);
});

async function shutdown(signal: string) {
  console.log(`[livora] ${signal} recibido, cerrando...`);
  httpServer.close();
  detenerSalarios();
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
