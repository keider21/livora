/** Constantes de dominio. SQLite no soporta enums, así que viven aquí. */

export const ROOM_STATUS = {
  LIVE: 'live',
  ENDED: 'ended',
} as const;

export const ROOM_CATEGORIES = ['chat', 'music', 'dance', 'game', 'talent'] as const;
export type RoomCategory = (typeof ROOM_CATEGORIES)[number];

export const MESSAGE_TYPE = {
  TEXT: 'text',
  GIFT: 'gift',
  JOIN: 'join',
  SYSTEM: 'system',
} as const;

export const TRANSACTION_TYPE = {
  TOPUP: 'topup',
  GIFT_SENT: 'gift_sent',
  GIFT_RECEIVED: 'gift_received',
  EXCHANGE: 'exchange',
} as const;

export const CURRENCY = {
  COINS: 'coins',
  DIAMONDS: 'diamonds',
} as const;

/** Cuántos diamantes recibe el anfitrión por cada moneda gastada en un regalo. */
export const DIAMONDS_PER_COIN = 0.5;

/** Cuántas monedas cuesta cambiar un diamante de vuelta (tasa de retiro). */
export const COINS_PER_DIAMOND = 1;

/** Experiencia que gana quien envía un regalo, por moneda gastada. */
export const XP_PER_COIN_SPENT = 1;
