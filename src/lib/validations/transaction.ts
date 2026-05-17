import { z } from 'zod';

export const transactionSchema = z.object({
  accountId: z.string().min(1, 'অ্যাকাউন্ট নির্বাচন করুন'),
  categoryId: z.string().min(1, 'ক্যাটাগরি নির্বাচন করুন'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().positive('পরিমাণ ০-এর বেশি হতে হবে'),
  description: z.string().min(1, 'বিবরণ প্রয়োজন'),
  date: z.string().min(1, 'তারিখ প্রয়োজন'),
  tags: z.union([
    z.array(z.string()),
    z.string().transform(s => s ? s.split(',').map(t => t.trim()).filter(Boolean) : []),
  ]).default([]),
  notes: z.string().optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
