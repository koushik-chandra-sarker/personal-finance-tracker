import type { DeductionItem, SalaryStructure } from '@/lib/salary-calculator';

export type SalaryTaxCategory = 'male' | 'female';
export type SalaryBudgetRule = '50-30-20' | '60-20-20' | '70-20-10' | 'custom';

export type SalaryBudgetCategory = {
  id: string;
  label: string;
  percent: number;
  color: string;
  group: 'needs' | 'wants' | 'savings';
};

export type SalaryScenarioPayload = {
  name: string;
  fiscalYear: string;
  currency: string;
  taxCategory: SalaryTaxCategory;
  grossMonthly: number;
  bonusMonths: number;
  structure: SalaryStructure;
  deductions: DeductionItem[];
  budgetRule: SalaryBudgetRule;
  budgetCategories: SalaryBudgetCategory[];
};

export type SalaryScenarioRow = SalaryScenarioPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
