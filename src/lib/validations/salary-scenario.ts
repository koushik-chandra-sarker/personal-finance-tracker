import { z } from 'zod';

export const salaryStructureSchema = z.object({
  basicPercent: z.coerce.number().min(0).max(100),
  houseRentPercent: z.coerce.number().min(0).max(100),
  medicalPercent: z.coerce.number().min(0).max(100),
  conveyanceFlat: z.coerce.number().min(0),
});

export const salaryDeductionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  amount: z.coerce.number().min(0),
  isPercentage: z.coerce.boolean(),
  percentOf: z.enum(['basic', 'gross']).optional(),
});

export const salaryBudgetCategorySchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  percent: z.coerce.number().min(0).max(100),
  color: z.string().trim().min(1),
  group: z.enum(['needs', 'wants', 'savings']),
});

export const salaryScenarioSchema = z.object({
  name: z.string().trim().min(1, 'Plan name is required').max(80, 'Plan name is too long'),
  fiscalYear: z.string().trim().min(4, 'Fiscal year is required').max(12),
  currency: z.string().trim().min(3).max(8),
  taxCategory: z.enum(['male', 'female']),
  grossMonthly: z.coerce.number().min(0, 'Gross salary cannot be negative'),
  bonusMonths: z.coerce.number().int().min(0).max(6),
  structure: salaryStructureSchema,
  deductions: z.array(salaryDeductionSchema).max(30),
  budgetRule: z.enum(['50-30-20', '60-20-20', '70-20-10', 'custom']),
  budgetCategories: z.array(salaryBudgetCategorySchema).max(40),
});

export type SalaryScenarioInput = z.infer<typeof salaryScenarioSchema>;
