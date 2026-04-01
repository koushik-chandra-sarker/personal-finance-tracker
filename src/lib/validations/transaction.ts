import { z } from 'zod';

export const transactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().min(1, 'Category is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  tags: z.union([
    z.array(z.string()),
    z.string().transform(s => s ? s.split(',').map(t => t.trim()).filter(Boolean) : []),
  ]).default([]),
  notes: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
