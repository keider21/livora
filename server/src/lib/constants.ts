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
  GIFT_REWARD: 'gift_reward',
  EXCHANGE: 'exchange',
} as const;

export const SEAT_STATUS = {
  /** Ha pedido subir y espera al anfitrión. */
  PENDING: 'pending',
  /** Está arriba, en la tira lateral. */
  ACTIVE: 'active',
} as const;

/** Cuántos invitados caben a la vez en la tira lateral. */
export const MAX_SEATS = 8;

export const CURRENCY = {
  COINS: 'coins',
  DIAMONDS: 'diamonds',
} as const;

/**
 * Economía de Livora, en un solo sitio.
 *
 * Referencia del sector (TikTok Live y similares): el espectador compra
 * monedas, las gasta en regalos, y quien recibe cobra en diamantes a una tasa
 * bastante por debajo de 1:1, que es de donde sale el margen de la plataforma.
 * Ahí ese reparto ronda el 50%.
 *
 * Aquí es del 5% por decisión del usuario (2026-09-06): gastar 1.000 monedas
 * deja 50 diamantes a quien recibe. Es mucho más agresivo que la referencia,
 * así que conviene tenerlo presente si algún día hay anfitriones reales.
 */
export const DIAMONDS_PER_COIN = 0.05;

/**
 * Diamantes y monedas valen lo mismo en dólares (100.000 de cada = 10 USD), de
 * modo que el cambio es 1:1. Solo existe en un sentido, de diamantes a monedas:
 * las monedas se compran y no se pueden convertir en diamantes, porque si no
 * cualquiera se fabricaría saldo de retiro comprando monedas.
 */
export const COINS_PER_DIAMOND = 1;

/** Monedas por dólar de recarga: 100.000 monedas = 10 USD. */
export const COINS_PER_USD = 10_000;

/** Diamantes por dólar al retirar: 100.000 diamantes = 10 USD. */
export const DIAMONDS_PER_USD = 10_000;

/** Experiencia que gana quien envía un regalo, por moneda gastada. */
export const XP_PER_COIN_SPENT = 1;
