/**
 * Contrato de la capa de streaming.
 *
 * La app no habla nunca con Agora o LiveKit directamente: pide credenciales a
 * esta interfaz. Cambiar de proveedor es escribir una clase nueva y ajustar
 * STREAM_PROVIDER en el .env, sin tocar rutas ni pantallas.
 */

/**
 * `guest` es el invitado que sube a la transmisión: publica micrófono pero
 * nunca cámara, porque en la tira lateral solo se le ve el avatar.
 */
export type StreamRole = 'host' | 'guest' | 'viewer';

export interface StreamCredentials {
  /** Nombre del proveedor que emitió las credenciales. */
  provider: string;
  /** Canal o sala en el proveedor. */
  channel: string;
  /** Identificador del participante dentro del canal. */
  identity: string;
  /** Rol con el que se entra: publica vídeo, solo voz, o solo consume. */
  role: StreamRole;
  /** Token de acceso al canal. */
  token: string;
  /** URL del servidor de medios, cuando el proveedor la necesita. */
  url?: string;
  /** Momento de expiración del token en milisegundos epoch. */
  expiresAt: number;
}

export interface StreamProvider {
  readonly name: string;

  /** Crea el canal al abrir una transmisión. */
  createChannel(roomId: string): Promise<string>;

  /** Emite credenciales para que un participante entre al canal. */
  issueToken(params: {
    channel: string;
    identity: string;
    role: StreamRole;
    ttlSeconds?: number;
  }): Promise<StreamCredentials>;

  /** Cierra el canal cuando termina la transmisión. */
  closeChannel(channel: string): Promise<void>;
}
