import { createHmac, randomUUID } from 'node:crypto';
import type { StreamCredentials, StreamProvider, StreamRole } from './provider';

const DEFAULT_TTL_SECONDS = 60 * 60;

/**
 * Proveedor simulado para desarrollo y pruebas.
 *
 * Emite tokens firmados con HMAC que la app puede verificar, sin depender de
 * ningún servicio externo ni consumir minutos de vídeo. El cliente móvil los
 * consume igual que consumiría los de Agora, así que enchufar el proveedor real
 * no cambia el flujo de pantallas.
 */
export class MockStreamProvider implements StreamProvider {
  readonly name = 'mock';

  private readonly secret: string;
  private readonly openChannels = new Set<string>();

  constructor(secret = 'livora-mock-stream') {
    this.secret = secret;
  }

  async createChannel(roomId: string): Promise<string> {
    const channel = `livora-${roomId}-${randomUUID().slice(0, 8)}`;
    this.openChannels.add(channel);
    return channel;
  }

  async issueToken(params: {
    channel: string;
    identity: string;
    role: StreamRole;
    ttlSeconds?: number;
  }): Promise<StreamCredentials> {
    const ttl = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = Date.now() + ttl * 1000;
    const claim = `${params.channel}.${params.identity}.${params.role}.${expiresAt}`;
    const signature = createHmac('sha256', this.secret).update(claim).digest('hex').slice(0, 32);

    return {
      provider: this.name,
      channel: params.channel,
      identity: params.identity,
      role: params.role,
      token: `mock.${Buffer.from(claim).toString('base64url')}.${signature}`,
      expiresAt,
    };
  }

  async closeChannel(channel: string): Promise<void> {
    this.openChannels.delete(channel);
  }

  /** Solo para pruebas: comprueba que un token fue emitido por este proveedor. */
  verify(token: string): boolean {
    const [prefix, payload, signature] = token.split('.');
    if (prefix !== 'mock' || !payload || !signature) return false;
    const claim = Buffer.from(payload, 'base64url').toString('utf8');
    const expected = createHmac('sha256', this.secret).update(claim).digest('hex').slice(0, 32);
    if (expected !== signature) return false;
    const expiresAt = Number(claim.split('.').pop());
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }
}
