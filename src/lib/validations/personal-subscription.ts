import { z } from 'zod';

export const personalSubscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  provider: z.string().trim().min(1, 'Provider is required'),
  planName: z.string().trim().optional().nullable(),
  accountId: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().trim().min(3, 'Currency is required').max(3, 'Use a 3-letter currency code'),
  billingCycle: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  nextBillingDate: z.string().min(1, 'Next billing date is required'),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']),
  autoRenew: z.coerce.boolean().default(true),
  reminderDays: z.coerce.number().int().min(0).max(60).default(3),
  websiteUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')).nullable(),
  notes: z.string().trim().optional().nullable(),
  color: z.string().trim().default('#6366f1'),
});

export type PersonalSubscriptionInput = z.infer<typeof personalSubscriptionSchema>;
