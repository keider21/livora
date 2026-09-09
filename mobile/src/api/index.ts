import { apiRequest } from './client';
import type { ChatMessage, GiftEvent, SeatsEvent } from '../realtime/events';
import type {
  AuditReport,
  CoinPackage,
  CurrentUser,
  Gift,
  PastStream,
  PlatformStats,
  Profile,
  PublicUser,
  RankingEntry,
  Room,
  RoomGoal,
  SalaryLevel,
  SalaryPayment,
  SalaryProgress,
  StreamCredentials,
  Transaction,
  Wallet,
} from './types';

export const auth = {
  register: (body: {
    email: string;
    username: string;
    password: string;
    displayName: string;
    country?: string;
    gender?: 'male' | 'female' | 'unspecified';
  }) => apiRequest<{ token: string; user: CurrentUser }>('/api/auth/register', { method: 'POST', body }),

  login: (body: { identifier: string; password: string }) =>
    apiRequest<{ token: string; user: CurrentUser }>('/api/auth/login', { method: 'POST', body }),

  me: () => apiRequest<{ user: CurrentUser }>('/api/auth/me'),
};

export const rooms = {
  list: (params: { category?: string; status?: 'live' | 'ended'; limit?: number; cursor?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    query.set('status', params.status ?? 'live');
    query.set('limit', String(params.limit ?? 20));
    if (params.cursor) query.set('cursor', params.cursor);
    return apiRequest<{ rooms: Room[]; nextCursor: string | null }>(`/api/rooms?${query.toString()}`);
  },

  create: (body: { title: string; category?: string; coverUrl?: string }) =>
    apiRequest<{ room: Room; credentials: StreamCredentials }>('/api/rooms', { method: 'POST', body }),

  get: (roomId: string) =>
    apiRequest<{
      room: Room;
      messages: ChatMessage[];
      isHost: boolean;
      isFollowingHost: boolean;
      /** Meta de salario del anfitrión al abrir; luego la refresca `room:goal`. */
      meta: RoomGoal & { niveles: SalaryLevel[] };
    }>(`/api/rooms/${roomId}`),

  join: (roomId: string) =>
    apiRequest<{ credentials: StreamCredentials; role: 'host' | 'viewer' }>(`/api/rooms/${roomId}/join`, {
      method: 'POST',
    }),

  end: (roomId: string) =>
    apiRequest<{ summary: { roomId: string; durationSeconds: number; totalDiamonds: number; peakViewers: number } }>(
      `/api/rooms/${roomId}/end`,
      { method: 'POST' },
    ),

  like: (roomId: string) => apiRequest<{ totalLikes: number }>(`/api/rooms/${roomId}/like`, { method: 'POST' }),

  // --- Invitados de la tira lateral ---

  seats: (roomId: string) => apiRequest<SeatsEvent>(`/api/rooms/${roomId}/seats`),

  /** Un espectador pide subir; queda pendiente hasta que el anfitrión responda. */
  requestSeat: (roomId: string) =>
    apiRequest<SeatsEvent>(`/api/rooms/${roomId}/seats/request`, { method: 'POST' }),

  /** El anfitrión acepta a alguien y recibe de vuelta el estado de la tira. */
  acceptSeat: (roomId: string, userId: string) =>
    apiRequest<SeatsEvent & { credentials: StreamCredentials }>(
      `/api/rooms/${roomId}/seats/${userId}/accept`,
      { method: 'POST' },
    ),

  /** Bajar a alguien de la tira, o rechazar su solicitud. */
  removeSeat: (roomId: string, userId: string) =>
    apiRequest<SeatsEvent>(`/api/rooms/${roomId}/seats/${userId}`, { method: 'DELETE' }),

  setSeatMic: (roomId: string, userId: string, micMuted: boolean) =>
    apiRequest<SeatsEvent>(`/api/rooms/${roomId}/seats/${userId}/mic`, {
      method: 'PATCH',
      body: { micMuted },
    }),
};

export const gifts = {
  /** Con `roomId` la respuesta trae el nivel de club de fans con ese anfitrión. */
  catalog: (roomId?: string) =>
    apiRequest<{ gifts: Gift[]; fanLevel: number }>(`/api/gifts${roomId ? `?roomId=${roomId}` : ''}`),
  /** Sin `recipientId` el regalo va al anfitrión; con él, a un invitado. */
  send: (body: { roomId: string; giftCode: string; quantity?: number; recipientIds?: string[] }) =>
    apiRequest<{ giftSend: GiftEvent; wallet: Wallet }>('/api/gifts/send', { method: 'POST', body }),
};

export const users = {
  profile: (username: string) => apiRequest<Profile>(`/api/users/${username}`),
  streams: (username: string) => apiRequest<{ streams: PastStream[] }>(`/api/users/${username}/streams`),
  search: (term: string) => apiRequest<{ users: PublicUser[] }>(`/api/users/search?q=${encodeURIComponent(term)}`),
  follow: (username: string) =>
    apiRequest<{ following: boolean; followers: number }>(`/api/users/${username}/follow`, { method: 'POST' }),
  unfollow: (username: string) =>
    apiRequest<{ following: boolean; followers: number }>(`/api/users/${username}/follow`, { method: 'DELETE' }),
  updateProfile: (body: { displayName?: string; bio?: string; avatarUrl?: string; country?: string }) =>
    apiRequest<{ user: PublicUser }>('/api/users/me', { method: 'PATCH', body }),
};

export const wallet = {
  get: () => apiRequest<{ wallet: Wallet; packages: CoinPackage[] }>('/api/wallet'),
  topUp: (packageId: string) =>
    apiRequest<{ wallet: Wallet; credited: number }>('/api/wallet/topup', { method: 'POST', body: { packageId } }),
  exchange: (diamonds: number) =>
    apiRequest<{ wallet: Wallet; coins: number }>('/api/wallet/exchange', { method: 'POST', body: { diamonds } }),
  transactions: () => apiRequest<{ transactions: Transaction[] }>('/api/wallet/transactions'),
};


export const hosts = {
  /** Progreso de hoy hacia la meta de salario, y lo cobrado los días anteriores. */
  salary: () =>
    apiRequest<{ progreso: SalaryProgress; historial: SalaryPayment[] }>('/api/hosts/me/salary'),
  /** Cómo va de dinero la plataforma. Solo la cuenta de pruebas; si no, 403. */
  stats: () => apiRequest<PlatformStats>('/api/hosts/me/stats'),
  /** Cuentas que no cuadran y salud del sorteo. Solo la cuenta de pruebas. */
  audit: () => apiRequest<AuditReport>('/api/hosts/me/audit'),
  auditUser: (userId: string) =>
    apiRequest<{ usuario: PublicUser & { coins: number; diamonds: number; isBanned: boolean }; movimientos: Transaction[] }>(
      `/api/hosts/me/audit/${userId}`,
    ),
  ban: (userId: string, banear: boolean) =>
    apiRequest<{ usuario: { id: string; username: string; isBanned: boolean } }>(
      `/api/hosts/me/audit/${userId}/ban`,
      { method: 'POST', body: { banear } },
    ),
  /** Solo funciona con la cuenta de pruebas; con cualquier otra devuelve 403. */
  reset: () =>
    apiRequest<{ resumen: { regalos: number; movimientos: number; salas: number; cuentas: number } }>(
      '/api/hosts/me/reset',
      { method: 'POST' },
    ),
};

export const ranking = {
  hosts: (period: 'day' | 'week' | 'all' = 'week') =>
    apiRequest<{ entries: RankingEntry[] }>(`/api/ranking/hosts?period=${period}`),
  senders: (period: 'day' | 'week' | 'all' = 'week') =>
    apiRequest<{ entries: RankingEntry[] }>(`/api/ranking/senders?period=${period}`),
};

export type { ChatMessage, GiftEvent, SeatInfo, SeatsEvent } from '../realtime/events';
export * from './types';
export { ApiError, DEFAULT_API_URL, getApiUrl, setApiUrl, setAuthToken } from './client';
