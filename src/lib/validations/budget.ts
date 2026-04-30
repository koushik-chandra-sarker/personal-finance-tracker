import { z } from 'zod';

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  rolloverEnabled: z.preprocess(
    (value) => value === true || value === 'true' || value === 'on' || value === '1',
    z.boolean()
  ).default(false),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
