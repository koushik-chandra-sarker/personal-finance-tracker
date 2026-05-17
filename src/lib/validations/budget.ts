import { z } from 'zod';

export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'ক্যাটাগরি নির্বাচন করুন'),
  amount: z.coerce.number().positive('পরিমাণ ০-এর বেশি হতে হবে'),
  rolloverEnabled: z.preprocess(
    (value) => value === true || value === 'true' || value === 'on' || value === '1',
    z.boolean()
  ).default(false),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
