import { io, type Socket } from 'socket.io-client';
import { getApiUrl } from '../api/client';
import { SOCKET_EVENTS } from './events';

let socket: Socket | null = null;
/** URL con la que se abrió el socket actual, para reconectar si el usuario cambia de servidor. */
let socketUrl: string | null = null;

/**
 * Salas en las que se está dentro.
 *
 * El servidor pierde esa pertenencia cuando el socket se cae, y eso pasa cada
 * vez que el teléfono suspende la app. Socket.io reconecta solo, pero volver a
 * entrar en la sala hay que pedirlo otra vez: sin esto, al volver a la app
 * seguían viéndose los regalos de antes pero no llegaba ninguno nuevo.
 */
const salas = new Set<string>();

/**
 * Conexión única para toda la app. Se crea al iniciar sesión y se reutiliza:
 * cada pantalla se suscribe a los eventos que necesita y se da de baja al salir.
 */
export function connectSocket(token: string): Socket {
  const url = getApiUrl();
  if (socket?.connected && socketUrl === url && (socket.auth as { token?: string })?.token === token) {
    return socket;
  }

  socket?.disconnect();
  socketUrl = url;
  socket = io(url, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000,
  });

  // Cada vez que la conexión vuelve, se entra otra vez en lo que estuviera
  // abierto. Vale también para la primera conexión, así que `joinRoomChannel`
  // puede llamarse antes de que el socket esté listo.
  socket.on('connect', () => {
    for (const roomId of salas) {
      socket?.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId });
    }
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  socketUrl = null;
  salas.clear();
}

export function joinRoomChannel(roomId: string): void {
  salas.add(roomId);
  socket?.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId });
}

export function leaveRoomChannel(roomId: string): void {
  salas.delete(roomId);
  socket?.emit(SOCKET_EVENTS.ROOM_LEAVE, { roomId });
}

export function sendRoomMessage(roomId: string, body: string): void {
  socket?.emit(SOCKET_EVENTS.ROOM_SEND_MESSAGE, { roomId, body });
}

export function likeRoom(roomId: string): void {
  socket?.emit(SOCKET_EVENTS.ROOM_LIKE, { roomId });
}
