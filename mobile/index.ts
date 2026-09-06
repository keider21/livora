// Entrada de la app. LiveKit necesita registrar sus globales de WebRTC antes
// de que se cargue cualquier pantalla, por eso esto va antes que expo-router.
import { registerGlobals } from '@livekit/react-native';

registerGlobals();

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('expo-router/entry');
