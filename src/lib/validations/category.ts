import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'ক্যাটাগরির নাম প্রয়োজন').max(30, 'নাম খুব বড়'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'সঠিক হেক্স রং দিন'),
  icon: z.string().min(1, 'আইকন নির্বাচন করুন'),
});

export type CategoryInput = z.infer<typeof categorySchema>;
