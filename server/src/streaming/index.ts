import { env } from '../config/env';
import { LiveKitStreamProvider } from './livekit-provider';
import { MockStreamProvider } from './mock-provider';
import type { StreamProvider } from './provider';

export * from './provider';
export { MockStreamProvider } from './mock-provider';
export { LiveKitStreamProvider } from './livekit-provider';

function build(): StreamProvider {
  switch (env.stream.provider) {
    case 'livekit': {
      const { livekitUrl, livekitApiKey, livekitApiSecret } = env.stream;
      if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
        // Mejor avisar y arrancar con el simulado que emitir tokens que ningún
        // servidor de medios va a aceptar.
        console.warn(
          '[streaming] STREAM_PROVIDER=livekit pero faltan LIVEKIT_URL, LIVEKIT_API_KEY o LIVEKIT_API_SECRET. Usando el simulado.',
        );
        return new MockStreamProvider();
      }
      return new LiveKitStreamProvider({ url: livekitUrl, apiKey: livekitApiKey, apiSecret: livekitApiSecret });
    }
    case 'agora':
      console.warn('[streaming] Agora no está implementado (la decisión fue LiveKit). Usando el simulado.');
      return new MockStreamProvider();
    case 'mock':
    default:
      return new MockStreamProvider();
  }
}

export const streamProvider: StreamProvider = build();
