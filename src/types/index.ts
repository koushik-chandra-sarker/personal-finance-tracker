import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

export type ActionResponse<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
};

export type FilterMode = 'include' | 'exclude';

export type TransactionFilters = {
  search?: string;
  categoryId?: string;
  accountId?: string;
  type?: 'INCOME' | 'EXPENSE';
  // Multi-select filter fields
  types?: string[];
  typeMode?: FilterMode;
  categoryIds?: string[];
  categoryMode?: FilterMode;
  accountIds?: string[];
  accountMode?: FilterMode;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
};

export type FinancialNoteFilters = {
  search?: string;
  mode?: 'SIMPLE' | 'EXTENDED';
  status?: 'OPEN' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';
  valueType?: 'MONEY' | 'ASSET' | 'MONEY_AND_ASSET' | 'OTHER';
  tags?: string[];
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
};

export type MonthlySummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
};

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: number;
  percentage: number;
};

export type BudgetWithSpent = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  rolloverEnabled: boolean;
  rolloverAmount: number;
  effectiveAmount: number;
  projectedRolloverAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  month: number;
  year: number;
  createdByName?: string | null;
  updatedByName?: string | null;
};

export type MonthlyTrend = {
  month: string;
  income: number;
  expense: number;
};

export type CategoryWithStats = {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  isDefault: boolean;
  budgetAmount: number | null;
  spent: number;
  _count: { transactions: number; budgets: number };
};
