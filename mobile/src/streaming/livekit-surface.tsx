import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useConnectionState,
  useLocalParticipant,
  useTracks,
} from '@livekit/react-native';
import { ConnectionState, Track } from 'livekit-client';
import { colors, radius, scrim, spacing } from '../theme';
import { ensureMediaPermissions } from './permissions';
import type { StreamSurfaceProps } from './provider';

/**
 * Superficie de vídeo real sobre LiveKit.
 *
 * El anfitrión publica cámara y micrófono, el invitado de la tira lateral solo
 * micrófono, y el espectador se limita a suscribirse. La sala y el token los
 * emite el servidor (LiveKitStreamProvider), aquí no hay ninguna clave. Ocupa el
 * mismo hueco que la superficie simulada, así la pantalla de la sala no
 * distingue una de otra.
 */
export function LiveKitStreamSurface({ credentials, hostName, children }: StreamSurfaceProps) {
  const isHost = credentials.role === 'host';
  const isGuest = credentials.role === 'guest';
  const publica = isHost || isGuest;
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>(publica ? 'pending' : 'granted');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publica) return;
    ensureMediaPermissions(isHost ? 'camera-and-mic' : 'mic').then((granted) =>
      setPermission(granted ? 'granted' : 'denied'),
    );
  }, [publica, isHost]);

  // La sesión de audio nativa (altavoz, modo llamada) se abre al entrar y se
  // cierra al salir, para no dejar el teléfono en modo comunicación.
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  if (!credentials.url) {
    return <Status message="El servidor no indicó la dirección de vídeo (LIVEKIT_URL)." />;
  }
  if (permission === 'pending') {
    return <Status message={isHost ? 'Pidiendo permiso de cámara y micrófono…' : 'Pidiendo permiso de micrófono…'} spinner />;
  }
  if (permission === 'denied') {
    return (
      <Status
        message={
          isHost
            ? 'Sin permiso de cámara o micrófono no se puede transmitir. Actívalos en los ajustes del teléfono.'
            : 'Sin permiso de micrófono no puedes hablar en la transmisión. Actívalo en los ajustes del teléfono.'
        }
      />
    );
  }
  if (error) {
    return <Status message={error} />;
  }

  return (
    <View style={styles.fill}>
      <LiveKitRoom
        serverUrl={credentials.url}
        token={credentials.token}
        connect
        audio={publica}
        video={isHost}
        onError={(err) => setError(`No se pudo conectar al vídeo: ${err.message}`)}
      >
        <Stage isHost={isHost} hostName={hostName} />
        {isHost ? <HostControls /> : null}
        {children}
      </LiveKitRoom>
    </View>
  );
}

/**
 * Si el servidor de vídeo no es alcanzable (típico: la app apunta a una
 * dirección de red local y el teléfono está fuera de esa red), LiveKit se queda
 * reintentando sin decir nada y la pantalla gira para siempre. Pasado este
 * tiempo se explica qué ocurre en vez de seguir esperando.
 */
const CONNECT_TIMEOUT_MS = 15000;

function Stage({ isHost, hostName }: { isHost: boolean; hostName: string }) {
  const connection = useConnectionState();
  const [tardando, setTardando] = useState(false);
  // Solo interesa la cámara: la del propio anfitrión (local) o la que llega
  // del anfitrión (remota) cuando se es espectador.
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const camera = tracks.find(isTrackReference);

  const conectando =
    connection === ConnectionState.Connecting || connection === ConnectionState.Reconnecting;

  useEffect(() => {
    if (!conectando) {
      setTardando(false);
      return;
    }
    const timer = setTimeout(() => setTardando(true), CONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [conectando]);

  if (conectando) {
    if (tardando) {
      return (
        <Status message="No se llega al servidor de vídeo. Suele pasar cuando la app apunta a una dirección de la red de casa y el teléfono está fuera de esa red. El chat y los regalos siguen funcionando." />
      );
    }
    return <Status message={connection === ConnectionState.Connecting ? 'Conectando al vídeo…' : 'Reconectando…'} spinner />;
  }
  if (connection === ConnectionState.Disconnected) {
    return <Status message="Sin conexión con el servidor de vídeo." />;
  }
  if (!camera) {
    return (
      <Status
        message={isHost ? 'Encendiendo la cámara…' : `${hostName} todavía no está emitiendo vídeo.`}
        spinner={isHost}
      />
    );
  }

  return (
    <VideoTrack
      trackRef={camera}
      style={StyleSheet.absoluteFill}
      objectFit="cover"
      mirror={camera.participant.isLocal && facing === 'user'}
    />
  );
}

/** Cámara activa del anfitrión; se comparte con los controles para saber si hay que reflejar. */
let facing: 'user' | 'environment' = 'user';

/**
 * Botones del anfitrión: cambiar de cámara, micrófono y cámara. Van en el
 * borde derecho, a media altura, donde la superposición de la sala no pone
 * nada (la sala deja pasar los toques con pointerEvents="box-none").
 */
function HostControls() {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, cameraTrack } = useLocalParticipant();
  const [flipping, setFlipping] = useState(false);

  async function flipCamera() {
    const track = cameraTrack?.track;
    if (!track || !('restartTrack' in track) || flipping) return;
    setFlipping(true);
    try {
      facing = facing === 'user' ? 'environment' : 'user';
      await (track as { restartTrack: (options: { facingMode: typeof facing }) => Promise<void> }).restartTrack({
        facingMode: facing,
      });
    } finally {
      setFlipping(false);
    }
  }

  return (
    <View style={styles.controls} pointerEvents="box-none">
      <ControlButton
        icon="camera-reverse"
        label="Cambiar cámara"
        onPress={flipCamera}
        disabled={!isCameraEnabled || flipping}
      />
      <ControlButton
        icon={isMicrophoneEnabled ? 'mic' : 'mic-off'}
        label={isMicrophoneEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
        active={!isMicrophoneEnabled}
        onPress={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      />
      <ControlButton
        icon={isCameraEnabled ? 'videocam' : 'videocam-off'}
        label={isCameraEnabled ? 'Apagar cámara' : 'Encender cámara'}
        active={!isCameraEnabled}
        onPress={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
      />
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[styles.control, active && styles.controlActive, disabled && styles.controlDisabled]}
    >
      <Ionicons name={icon} size={20} color={active ? colors.onPrimary : colors.text} />
    </Pressable>
  );
}

function Status({ message, spinner }: { message: string; spinner?: boolean }) {
  return (
    <View style={[styles.fill, styles.center]}>
      {spinner ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  message: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  controls: { position: 'absolute', right: spacing.md, top: '38%', gap: spacing.sm },
  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: scrim.strong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  controlDisabled: { opacity: 0.4 },
});
