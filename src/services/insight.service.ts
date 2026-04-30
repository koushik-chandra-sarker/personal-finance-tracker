import { prisma } from '@/lib/prisma';
import { subMonths } from 'date-fns';
import { getBudgets } from '@/services/budget.service';

type Insight = {
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
};

export async function getSpendingInsights(userId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const lastMonthDate = subMonths(now, 1);
  const lastMonth = lastMonthDate.getMonth() + 1;
  const lastYear = lastMonthDate.getFullYear();

  const startThis = new Date(thisYear, thisMonth - 1, 1);
  const endThis = new Date(thisYear, thisMonth, 0, 23, 59, 59);
  const startLast = new Date(lastYear, lastMonth - 1, 1);
  const endLast = new Date(lastYear, lastMonth, 0, 23, 59, 59);

  // Current month totals
  const [incomeThis, expenseThis] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', date: { gte: startThis, lte: endThis } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: startThis, lte: endThis } },
      _sum: { amount: true },
    }),
  ]);

  const [expenseLast] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: startLast, lte: endLast } },
      _sum: { amount: true },
    }),
  ]);

  const incThisVal = Number(incomeThis._sum.amount || 0);
  const expThisVal = Number(expenseThis._sum.amount || 0);
  const expLastVal = Number(expenseLast._sum.amount || 0);

  // Savings rate
  if (incThisVal > 0) {
    const savingsRate = Math.round(((incThisVal - expThisVal) / incThisVal) * 100);
    if (savingsRate >= 20) {
      insights.push({ type: 'success', title: 'Great Savings!', message: `You're saving ${savingsRate}% of your income this month. Keep it up!` });
    } else if (savingsRate < 0) {
      insights.push({ type: 'warning', title: 'Overspending Alert', message: `You've spent more than you earned this month. Consider reducing expenses.` });
    } else if (savingsRate < 10) {
      insights.push({ type: 'info', title: 'Low Savings Rate', message: `Your savings rate is ${savingsRate}%. Try to aim for at least 20%.` });
    }
  }

  // Spending trend
  if (expLastVal > 0 && expThisVal > 0) {
    const change = Math.round(((expThisVal - expLastVal) / expLastVal) * 100);
    if (change > 20) {
      insights.push({ type: 'warning', title: 'Spending Up', message: `Your spending is up ${change}% compared to last month.` });
    } else if (change < -10) {
      insights.push({ type: 'success', title: 'Spending Down', message: `Great job! Spending is down ${Math.abs(change)}% from last month.` });
    }
  }

  // Top spending category
  const topCategory = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'EXPENSE', date: { gte: startThis, lte: endThis } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 1,
  });

  if (topCategory.length > 0) {
    const cat = await prisma.category.findUnique({ where: { id: topCategory[0].categoryId } });
    const amount = Number(topCategory[0]._sum.amount || 0);
    if (cat && expThisVal > 0) {
      const pct = Math.round((amount / expThisVal) * 100);
      insights.push({
        type: 'info',
        title: 'Top Spending',
        message: `${cat.name} is your biggest expense at ${pct}% of total spending.`,
      });
    }
  }

  // Budget alerts
  const budgets = await getBudgets(userId, thisMonth, thisYear);

  for (const budget of budgets) {
    const spentVal = budget.spent;
    const budgetVal = budget.effectiveAmount;
    const pct = budgetVal > 0 ? Math.round((spentVal / budgetVal) * 100) : 0;

    if (pct > 100) {
      insights.push({ type: 'warning', title: `${budget.categoryName} Over Budget`, message: `You've exceeded your ${budget.categoryName} effective budget by ${pct - 100}%.` });
    } else if (pct > 80) {
      insights.push({ type: 'info', title: `${budget.categoryName} Budget Alert`, message: `You've used ${pct}% of your ${budget.categoryName} effective budget.` });
    } else if (budget.projectedRolloverAmount > 0) {
      insights.push({
        type: 'success',
        title: `${budget.categoryName} Rollover`,
        message: `${budget.categoryName} is on track to roll over ${budget.projectedRolloverAmount.toFixed(2)} next month.`,
      });
    }
  }

  return insights.slice(0, 5);
}
