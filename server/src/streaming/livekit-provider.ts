import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import type { StreamCredentials, StreamProvider, StreamRole } from './provider';

const DEFAULT_TTL_SECONDS = 60 * 60;

export interface LiveKitConfig {
  /** URL a la que se conecta el cliente: ws:// o wss://. */
  url: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Proveedor real sobre LiveKit (código abierto, se hospeda gratis).
 *
 * Los tokens se firman aquí con la clave del servidor, así la app nunca la
 * conoce. LiveKit crea la sala al entrar el primer participante, por eso
 * `createChannel` solo elige el nombre; `closeChannel` la borra para expulsar a
 * quien quede dentro, y tolera que el servidor de medios no esté accesible.
 */
export class LiveKitStreamProvider implements StreamProvider {
  readonly name = 'livekit';

  private readonly rooms: RoomServiceClient;

  constructor(private readonly config: LiveKitConfig) {
    this.rooms = new RoomServiceClient(toHttpUrl(config.url), config.apiKey, config.apiSecret);
  }

  async createChannel(roomId: string): Promise<string> {
    // LiveKit admite hasta 64 caracteres; el id (UUID) cabe con el prefijo.
    return `livora-${roomId}`;
  }

  async issueToken(params: {
    channel: string;
    identity: string;
    role: StreamRole;
    ttlSeconds?: number;
  }): Promise<StreamCredentials> {
    const ttl = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const isHost = params.role === 'host';

    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity: params.identity,
      ttl,
    });
    token.addGrant({
      room: params.channel,
      roomJoin: true,
      canPublish: isHost,
      canSubscribe: true,
      // El chat va por nuestro socket, no por LiveKit: nadie publica datos.
      canPublishData: false,
    });

    return {
      provider: this.name,
      channel: params.channel,
      identity: params.identity,
      role: params.role,
      token: await token.toJwt(),
      url: this.config.url,
      expiresAt: Date.now() + ttl * 1000,
    };
  }

  async closeChannel(channel: string): Promise<void> {
    try {
      await this.rooms.deleteRoom(channel);
    } catch (error) {
      // Si la sala ya no existe o el servidor de medios está caído, la
      // transmisión se cierra igual en nuestra base de datos.
      console.warn(`[livekit] No se pudo borrar la sala ${channel}:`, error instanceof Error ? error.message : error);
    }
  }
}

/** La API de LiveKit se llama por HTTP aunque los clientes entren por WebSocket. */
export function toHttpUrl(url: string): string {
  return url.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://');
}
