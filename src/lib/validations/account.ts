import { z } from 'zod';

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['CASH', 'BANK', 'MOBILE_WALLET', 'CREDIT_CARD', 'INVESTMENT']),
  balance: z.coerce.number().default(0),
  color: z.string().default('#6366f1'),
  icon: z.string().default('wallet'),
});

export type AccountInput = z.infer<typeof accountSchema>;
