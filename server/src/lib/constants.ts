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
  SALARY: 'salary',
  CHEST_OPEN: 'chest_open',
  CHEST_PRIZE: 'chest_prize',
  EXCHANGE: 'exchange',
  /** Lo que se lleva la agencia de lo que gana un anfitrión suyo. */
  AGENCY_COMMISSION: 'agency_commission',
} as const;

export const SEAT_STATUS = {
  /** Ha pedido subir y espera al anfitrión. */
  PENDING: 'pending',
  /** Está arriba, en la tira lateral. */
  ACTIVE: 'active',
} as const;

/** Cuántos invitados caben a la vez en la tira lateral. */
/**
 * Los tres formatos de sala.
 *
 * - `live`: la cámara del anfitrión llena la pantalla. Es el de siempre.
 * - `party`: la cámara se encoge y al lado caben más invitados; la sala pasa de
 *   ser un escenario a ser una mesa.
 * - `audio`: sin cámara de nadie. Al no gastar vídeo caben muchos más, y es lo
 *   que aguanta una conexión mala, que es donde más gente se cae.
 */
export const ROOM_MODE = {
  LIVE: 'live',
  PARTY: 'party',
  AUDIO: 'audio',
} as const;

export const ROOM_MODES = [ROOM_MODE.LIVE, ROOM_MODE.PARTY, ROOM_MODE.AUDIO] as const;

/**
 * Cuánta gente cabe arriba en cada formato.
 *
 * El tope no es estético: cada invitado publica su propio audio, así que el
 * número sale de lo que aguanta la sala sin que se convierta en ruido.
 */
export const ASIENTOS_POR_MODO: Record<string, number> = {
  [ROOM_MODE.LIVE]: 8,
  [ROOM_MODE.PARTY]: 10,
  [ROOM_MODE.AUDIO]: 25,
};

/** El mayor de todos, para lo que necesita un número fijo. */
export const MAX_SEATS = 25;

export function asientosDelModo(mode: string): number {
  return ASIENTOS_POR_MODO[mode] ?? ASIENTOS_POR_MODO[ROOM_MODE.LIVE]!;
}

/** Lo que se anuncia al abrir si el anfitrión no escribe nada. */
export const BIENVENIDA_POR_DEFECTO = '¡Bienvenidos a mi live!';

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
 * Los regalos exclusivos son la excepción: dejan el 70% en diamantes y la
 * plataforma se queda el 30%. No premian nunca y cuestan decenas de miles de
 * monedas, así que su gracia es que quien los recibe se lleva casi todo.
 *
 * **No cuentan para las metas de salario** (`lib/salary`), que se miden solo
 * sobre los regalos de la suerte.
 */
export const DIAMONDS_PER_COIN_EXCLUSIVE = 0.7;

/** Tier de los regalos exclusivos, que cobran la tasa de arriba. */
export const GIFT_TIER_EXCLUSIVE = 'exclusive';
/**
 * Los cofres son regalos con dos particularidades: **siempre** premian, y el
 * premio no vuelve a quien envía sino que se lo lleva quien lo recibe, como si
 * le hubieran mandado un regalo de ese tamaño.
 */
export const GIFT_TIER_CHEST = 'chest';

/**
 * Club de fans: monedas que hay que haber gastado con un anfitrión para llegar
 * a cada nivel. El nivel es cuántos umbrales se han superado, así que gastar
 * 10.000 monedas con alguien deja en nivel 3.
 */
export const FAN_LEVEL_THRESHOLDS = [1_000, 5_000, 10_000, 50_000, 100_000, 500_000] as const;

export function fanLevelFromCoins(coins: number): number {
  return FAN_LEVEL_THRESHOLDS.filter((threshold) => coins >= threshold).length;
}

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
