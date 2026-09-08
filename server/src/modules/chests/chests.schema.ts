import { z } from 'zod';

export const abrirCofreSchema = z.object({
  code: z.string().min(1),
  /** Cuántos abrir de golpe. Cada uno se sortea por separado. */
  cantidad: z.number().int().min(1).max(50).default(1),
});

export type AbrirCofreInput = z.infer<typeof abrirCofreSchema>;
