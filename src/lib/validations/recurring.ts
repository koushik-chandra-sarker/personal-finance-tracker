import { z } from 'zod';

export const recurringSchema = z.object({
  accountId: z.string().min(1, 'অ্যাকাউন্ট নির্বাচন করুন'),
  categoryId: z.string().min(1, 'ক্যাটাগরি নির্বাচন করুন'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce.number().positive('পরিমাণ ০-এর বেশি হতে হবে'),
  description: z.string().min(1, 'বিবরণ প্রয়োজন'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  nextRunDate: z.string().min(1, 'শুরুর তারিখ প্রয়োজন'),
});

export type RecurringInput = z.infer<typeof recurringSchema>;
