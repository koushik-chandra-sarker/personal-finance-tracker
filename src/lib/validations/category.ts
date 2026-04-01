import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(30, 'Name is too long'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color code'),
  icon: z.string().min(1, 'Icon must be selected'),
});

export type CategoryInput = z.infer<typeof categorySchema>;
