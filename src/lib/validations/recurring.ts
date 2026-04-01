import { z } from 'zod';

export const recurringSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().min(1, 'Category is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  nextRunDate: z.string().min(1, 'Start date is required'),
});

export type RecurringInput = z.infer<typeof recurringSchema>;
