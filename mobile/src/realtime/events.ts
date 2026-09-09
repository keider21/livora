/**
 * Espejo de server/src/realtime/events.ts. Si cambias un evento en el servidor,
 * cambia también este archivo.
 */

export const SOCKET_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_SEND_MESSAGE: 'room:send_message',
  ROOM_LIKE: 'room:like',

  ROOM_MESSAGE: 'room:message',
  ROOM_GIFT: 'room:gift',
  ROOM_VIEWERS: 'room:viewers',
  ROOM_LIKES: 'room:likes',
  ROOM_ENDED: 'room:ended',
  ROOM_SEATS: 'room:seats',
  ROOM_GOAL: 'room:goal',
  WALLET_UPDATED: 'wallet:updated',
  ERROR: 'app:error',
} as const;

export interface ChatMessage {
  id: string;
  roomId: string;
  type: 'text' | 'gift' | 'join' | 'system';
  body: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
  } | null;
}

export interface GiftEvent {
  id: string;
  roomId: string;
  quantity: number;
  coinsSpent: number;
  diamondsEarned: number;
  /** Monedas devueltas al emisor por el premio, 0 si no tocó. */
  coinsRewarded: number;
  /** El mayor multiplicador que salió, null si no hubo premio. */
  luckyMultiplier: number | null;
  /** Cuántas unidades del envío salieron premiadas. */
  luckyWins: number;
  /**
   * Suma de los multiplicadores que salieron: dos aciertos de ×500 son 1000.
   * Es el número grande que se enseña en pantalla, el «×1000».
   */
  luckyTimes: number;
  createdAt: string;
  gift: { code: string; name: string; emoji: string; image: string | null; tier: string; animation: string };
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  /** A quién se lo enviaron: el anfitrión o un invitado de la tira. */
  recipient: { id: string; username: string; displayName: string; avatarUrl: string | null };
  roomTotalDiamonds: number;
}

/** Un invitado en la tira lateral, o alguien esperando a que le suban. */
export interface SeatInfo {
  userId: string;
  status: 'pending' | 'active';
  position: number | null;
  micMuted: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
  };
}

export interface SeatsEvent {
  roomId: string;
  seats: SeatInfo[];
  /** Solicitudes sin responder. Solo llegan al anfitrión. */
  pending: SeatInfo[];
}

/**
 * Meta de salario del anfitrión de la sala, para la barra que se llena en
 * directo. Se manda a todos: llegar a la meta es cosa de la sala entera, no solo
 * de quien transmite.
 */
export interface RoomGoalEvent {
  roomId: string;
  /** Monedas de regalos de la suerte que lleva el anfitrión hoy. */
  luckyCoins: number;
  nivel: number;
  /** Monedas con las que empezó el tramo en curso: el suelo de la barra. */
  base: number;
  /** Meta y pago del siguiente nivel; null si ya está en el más alto. */
  siguiente: { nivel: number; meta: number; salario: number } | null;
  liveSeconds: number;
  segundosMinimos: number;
  cumpleHoras: boolean;
}

export interface ViewersEvent {
  roomId: string;
  count: number;
}

export interface LikesEvent {
  roomId: string;
  totalLikes: number;
}

export interface RoomEndedEvent {
  roomId: string;
  durationSeconds: number;
  totalDiamonds: number;
  peakViewers: number;
}
