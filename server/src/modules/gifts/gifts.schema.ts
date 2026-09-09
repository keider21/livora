import { z } from 'zod';

export const sendGiftSchema = z.object({
  roomId: z.string().min(1),
  giftCode: z.string().min(1),
  quantity: z.number().int().min(1).max(9_999).default(1),
  /**
   * A quiénes va. Si no se dice, al anfitrión, como antes de existir la tira.
   * Se admite enviarse a uno mismo y a varias personas a la vez.
   */
  recipientIds: z.array(z.string().min(1)).min(1).max(16).optional(),
});

export type SendGiftInput = z.infer<typeof sendGiftSchema>;
