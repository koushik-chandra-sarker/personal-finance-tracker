import type { Prisma } from '@prisma/client';

export const STARTER_CATEGORIES = [
  { name: 'Salary', type: 'INCOME' as const, icon: 'briefcase', color: '#10b981' },
  { name: 'Freelance', type: 'INCOME' as const, icon: 'laptop', color: '#06b6d4' },
  { name: 'Investments', type: 'INCOME' as const, icon: 'trending-up', color: '#8b5cf6' },
  { name: 'Other Income', type: 'INCOME' as const, icon: 'plus-circle', color: '#6366f1' },
  { name: 'Food & Dining', type: 'EXPENSE' as const, icon: 'utensils', color: '#ef4444' },
  { name: 'Transportation', type: 'EXPENSE' as const, icon: 'car', color: '#f97316' },
  { name: 'Housing', type: 'EXPENSE' as const, icon: 'home', color: '#eab308' },
  { name: 'Utilities', type: 'EXPENSE' as const, icon: 'zap', color: '#14b8a6' },
  { name: 'Entertainment', type: 'EXPENSE' as const, icon: 'film', color: '#ec4899' },
  { name: 'Shopping', type: 'EXPENSE' as const, icon: 'shopping-bag', color: '#a855f7' },
  { name: 'Healthcare', type: 'EXPENSE' as const, icon: 'heart', color: '#f43f5e' },
  { name: 'Education', type: 'EXPENSE' as const, icon: 'book', color: '#3b82f6' },
  { name: 'Personal', type: 'EXPENSE' as const, icon: 'user', color: '#64748b' },
  { name: 'Other Expense', type: 'EXPENSE' as const, icon: 'minus-circle', color: '#78716c' },
];

export async function clearUserWorkspaceData(
  tx: Prisma.TransactionClient,
  userId: string,
  options: { recreateStarterData?: boolean } = {},
) {
  await tx.notification.deleteMany({ where: { userId } });
  await tx.salaryScenario.deleteMany({ where: { userId } });
  await tx.financialNote.deleteMany({ where: { userId } });
  await tx.personalSubscription.deleteMany({ where: { userId } });
  await tx.recurringTransaction.deleteMany({ where: { userId } });
  await tx.investment.deleteMany({ where: { userId } });
  await tx.investmentTypeConfig.deleteMany({ where: { userId } });
  await tx.goal.deleteMany({ where: { userId } });
  await tx.budget.deleteMany({ where: { userId } });
  await tx.transaction.deleteMany({ where: { userId } });
  await tx.category.deleteMany({ where: { userId } });
  await tx.account.deleteMany({ where: { userId } });

  if (options.recreateStarterData) {
    await tx.category.createMany({
      data: STARTER_CATEGORIES.map((category) => ({
        userId,
        ...category,
        isDefault: true,
      })),
    });

    await tx.account.create({
      data: {
        userId,
        name: 'Cash',
        type: 'CASH',
        balance: 0,
        color: '#10b981',
        icon: 'wallet',
      },
    });
  }
}

export function getDeletedUserEmail(userId: string) {
  return `deleted-${userId}-${Date.now()}@deleted.local`;
}
