import { z } from 'zod';

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional()
);

const optionalNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().positive('পরিমাণ ০-এর বেশি হতে হবে').optional()
);

const optionalDate = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional()
);

export const financialNoteSchema = z.object({
  mode: z.enum(['SIMPLE', 'EXTENDED']).default('SIMPLE'),
  title: z.string().trim().min(1, 'শিরোনাম প্রয়োজন'),
  description: z.string().trim().min(1, 'বিবরণ প্রয়োজন'),
  tags: z.union([
    z.array(z.string()),
    z.string().transform(s => s ? s.split(',').map(t => t.trim()).filter(Boolean) : []),
  ]).default([]),
  counterpartyName: optionalText,
  valueType: z.enum(['MONEY', 'ASSET', 'MONEY_AND_ASSET', 'OTHER']).optional(),
  amount: optionalNumber,
  assetName: optionalText,
  assetDetails: optionalText,
  providedDate: optionalDate,
  expectedReturnDate: optionalDate,
  returnedDate: optionalDate,
  status: z.enum(['OPEN', 'PARTIAL', 'RETURNED', 'CANCELLED']).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'EXTENDED' && data.status === 'RETURNED' && !data.returnedDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['returnedDate'],
      message: 'স্ট্যাটাস ফেরত হলে ফেরতের তারিখ প্রয়োজন',
    });
  }
});

export type FinancialNoteInput = z.infer<typeof financialNoteSchema>;
