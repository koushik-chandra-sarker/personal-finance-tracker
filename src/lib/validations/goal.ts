import { z } from 'zod';

export const goalSchema = z.object({
  name: z.string().min(1, 'নাম প্রয়োজন'),
  targetAmount: z.coerce.number().positive('লক্ষ্যমাত্রা ০-এর বেশি হতে হবে'),
  deadline: z.string().min(1, 'শেষ সময় প্রয়োজন'),
  color: z.string().default('#10b981'),
  icon: z.string().default('target'),
});

export const contributeSchema = z.object({
  accountId: z.string().min(1, 'অ্যাকাউন্ট নির্বাচন করুন'),
  amount: z.coerce.number().positive('পরিমাণ ০-এর বেশি হতে হবে'),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type ContributeInput = z.infer<typeof contributeSchema>;
