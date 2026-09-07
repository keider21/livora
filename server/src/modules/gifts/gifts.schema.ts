import { z } from 'zod';

export const sendGiftSchema = z.object({
  roomId: z.string().min(1),
  giftCode: z.string().min(1),
  quantity: z.number().int().min(1).max(999).default(1),
  /** A quién va. Si no se dice, al anfitrión, como antes de existir la tira. */
  recipientId: z.string().min(1).optional(),
});

export type SendGiftInput = z.infer<typeof sendGiftSchema>;
