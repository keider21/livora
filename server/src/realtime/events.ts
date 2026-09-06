/**
 * Contrato de eventos en tiempo real. El cliente móvil replica estos nombres y
 * tipos en mobile/src/realtime/events.ts: si cambias uno, cambia los dos.
 */

export const SOCKET_EVENTS = {
  // cliente -> servidor
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_SEND_MESSAGE: 'room:send_message',
  ROOM_LIKE: 'room:like',

  // servidor -> cliente
  ROOM_MESSAGE: 'room:message',
  ROOM_GIFT: 'room:gift',
  ROOM_VIEWERS: 'room:viewers',
  ROOM_LIKES: 'room:likes',
  ROOM_ENDED: 'room:ended',
  WALLET_UPDATED: 'wallet:updated',
  ERROR: 'app:error',
} as const;

export interface ChatMessagePayload {
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

export interface GiftEventPayload {
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

export interface ViewersPayload {
  roomId: string;
  count: number;
}

export interface LikesPayload {
  roomId: string;
  totalLikes: number;
}

export interface RoomEndedPayload {
  roomId: string;
  durationSeconds: number;
  totalDiamonds: number;
  peakViewers: number;
}

export interface WalletPayload {
  coins: number;
  diamonds: number;
}

export function roomChannel(roomId: string): string {
  return `room:${roomId}`;
}

export function userChannel(userId: string): string {
  return `user:${userId}`;
}
