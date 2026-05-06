import { z } from 'zod';

export const investmentTypeConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9_]+$/, 'Slug must be lowercase with underscores'),
  description: z.string().optional(),
  icon: z.string().default('trending-up'),
  color: z.string().default('#6366f1'),
  hasInterestRate: z.boolean().default(false),
  hasReturnFrequency: z.boolean().default(false),
  hasMaturityDate: z.boolean().default(true),
  hasMonthlyInstallment: z.boolean().default(false),
  hasQuantity: z.boolean().default(false),
  hasInstitution: z.boolean().default(true),
  hasAccountNumber: z.boolean().default(true),
  returnTypes: z.array(z.string()).default([]),
});

export const investmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  typeConfigId: z.string().min(1, 'Investment type is required'),
  institutionName: z.string().optional(),
  accountNumber: z.string().optional(),
  investedAmount: z.coerce.number().positive('Invested amount must be positive'),
  currentValue: z.coerce.number().min(0, 'Current value cannot be negative'),
  interestRate: z.coerce.number().min(0).optional(),
  returnFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'AT_MATURITY', 'ON_SALE']).optional(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  maturityDate: z.string().optional(),
  linkedAccountId: z.string().optional(),
  monthlyInstallment: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(0).optional(),
  avgBuyPrice: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  color: z.string().default('#6366f1'),
  icon: z.string().default('trending-up'),
});

export const investmentReturnSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.string().min(1, 'Return type is required'),
  accountId: z.string().min(1, 'Deposit account is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

export type InvestmentTypeConfigInput = z.infer<typeof investmentTypeConfigSchema>;
export type InvestmentInput = z.infer<typeof investmentSchema>;
export type InvestmentReturnInput = z.infer<typeof investmentReturnSchema>;
