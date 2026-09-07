import { z } from 'zod';
import { ROOM_CATEGORIES } from '../../lib/constants';

export const createRoomSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(60, 'Máximo 60 caracteres'),
  category: z.enum(ROOM_CATEGORIES).default('chat'),
  coverUrl: z.string().url().optional(),
});

export const listRoomsSchema = z.object({
  category: z.enum(ROOM_CATEGORIES).optional(),
  status: z.enum(['live', 'ended']).default('live'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'El mensaje está vacío').max(200, 'Máximo 200 caracteres'),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type ListRoomsInput = z.infer<typeof listRoomsSchema>;

export const seatMicSchema = z.object({
  micMuted: z.boolean(),
});

export type SeatMicInput = z.infer<typeof seatMicSchema>;
