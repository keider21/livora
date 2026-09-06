import type { ReactNode } from 'react';
import type { StreamCredentials } from '../api/types';
import { MockStreamSurface } from './mock-surface';
import { LiveKitStreamSurface } from './livekit-surface';

/**
 * La app pinta el vídeo a través de este contrato, nunca llamando al SDK
 * directamente. Para usar Agora o LiveKit basta con escribir otro objeto que
 * cumpla `StreamRenderer` y devolverlo desde `getStreamRenderer`.
 */
export interface StreamSurfaceProps {
  credentials: StreamCredentials;
  /** Nombre del anfitrión, para mostrarlo mientras no hay vídeo real. */
  hostName: string;
  avatarUrl?: string | null;
  muted?: boolean;
  children?: ReactNode;
}

export interface StreamRenderer {
  name: string;
  Surface: (props: StreamSurfaceProps) => ReactNode;
}

const mockRenderer: StreamRenderer = {
  name: 'mock',
  Surface: MockStreamSurface,
};

const livekitRenderer: StreamRenderer = {
  name: 'livekit',
  Surface: LiveKitStreamSurface,
};

export function getStreamRenderer(provider: string): StreamRenderer {
  switch (provider) {
    case 'livekit':
      return livekitRenderer;
    default:
      return mockRenderer;
  }
}
