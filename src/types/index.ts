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

export type TransactionFilters = {
  search?: string;
  categoryId?: string;
  accountId?: string;
  type?: 'INCOME' | 'EXPENSE';
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  page?: number;
  limit?: number;
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
  spent: number;
  percentage: number;
  month: number;
  year: number;
};

export type MonthlyTrend = {
  month: string;
  income: number;
  expense: number;
};
