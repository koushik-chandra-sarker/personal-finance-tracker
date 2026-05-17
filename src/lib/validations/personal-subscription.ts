import { z } from 'zod';

export const personalSubscriptionSchema = z.object({
  name: z.string().trim().min(1, 'নাম প্রয়োজন'),
  provider: z.string().trim().min(1, 'প্রদানকারী প্রয়োজন'),
  planName: z.string().trim().optional().nullable(),
  accountId: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  amount: z.coerce.number().positive('পরিমাণ ০-এর বেশি হতে হবে'),
  currency: z.string().trim().min(3, 'কারেন্সি প্রয়োজন').max(3, '৩ অক্ষরের কারেন্সি কোড দিন'),
  billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  nextBillingDate: z.string().min(1, 'পরবর্তী বিলিং তারিখ প্রয়োজন'),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']),
  autoRenew: z.coerce.boolean().default(true),
  reminderDays: z.coerce.number().int().min(0).max(60).default(3),
  websiteUrl: z.string().trim().url('সঠিক URL দিন').optional().or(z.literal('')).nullable(),
  notes: z.string().trim().optional().nullable(),
  color: z.string().trim().default('#6366f1'),
});

export type PersonalSubscriptionInput = z.infer<typeof personalSubscriptionSchema>;
