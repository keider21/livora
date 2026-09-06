import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Correo inválido').toLowerCase(),
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[a-z0-9_]+$/i, 'Solo letras, números y guion bajo')
    .toLowerCase(),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
  displayName: z.string().min(2, 'Mínimo 2 caracteres').max(32, 'Máximo 32 caracteres'),
  country: z.string().length(2, 'Usa el código ISO de 2 letras').optional(),
  gender: z.enum(['male', 'female', 'unspecified']).default('unspecified'),
});

export const loginSchema = z.object({
  // Se acepta correo o nombre de usuario en el mismo campo.
  identifier: z.string().min(3, 'Indica tu correo o usuario'),
  password: z.string().min(1, 'Indica tu contraseña'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
