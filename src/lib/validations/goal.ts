import { z } from 'zod';

export const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.coerce.number().positive('Target must be positive'),
  deadline: z.string().min(1, 'Deadline is required'),
  color: z.string().default('#10b981'),
  icon: z.string().default('target'),
});

export const contributeSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type ContributeInput = z.infer<typeof contributeSchema>;
