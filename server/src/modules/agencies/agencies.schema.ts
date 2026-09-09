import { z } from 'zod';

export const createAgencySchema = z.object({
  name: z.string().trim().min(3).max(40),
  /** Entre 0 y el tope; si no se dice, la de por defecto. */
  rate: z.number().min(0.01).max(0.3).optional(),
});

export const joinAgencySchema = z.object({
  code: z.string().trim().min(4).max(12),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
export type JoinAgencyInput = z.infer<typeof joinAgencySchema>;
