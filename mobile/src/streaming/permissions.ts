import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Pide cámara y micrófono en Android en tiempo de ejecución, o solo el
 * micrófono cuando se sube como invitado. En iOS el sistema pregunta solo la
 * primera vez que se accede a cada dispositivo, con los textos que fija el
 * plugin de WebRTC en app.json.
 */
export async function ensureMediaPermissions(kind: 'camera-and-mic' | 'mic' = 'camera-and-mic'): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  // El invitado de la tira lateral solo publica voz: pedirle la cámara sería
  // pedir un permiso que no va a usar.
  const permisos =
    kind === 'mic'
      ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
      : [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];

  const results = await PermissionsAndroid.requestMultiple(permisos);

  return Object.values(results).every((result) => result === PermissionsAndroid.RESULTS.GRANTED);
}
