import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Pide cámara y micrófono en Android en tiempo de ejecución. En iOS el sistema
 * pregunta solo la primera vez que se accede a cada dispositivo, con los textos
 * que fija el plugin de WebRTC en app.json.
 */
export async function ensureMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  return Object.values(results).every((result) => result === PermissionsAndroid.RESULTS.GRANTED);
}
