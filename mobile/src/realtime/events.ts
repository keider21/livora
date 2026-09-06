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
  createdAt: string;
  gift: { code: string; name: string; emoji: string; tier: string; animation: string };
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  roomTotalDiamonds: number;
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
