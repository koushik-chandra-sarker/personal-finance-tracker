import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getBudgets } from '@/services/budget.service';
import { createNotificationOnce, getOrCreateNotificationPreferences } from '@/services/notification.service';
import { addDays, differenceInCalendarDays, endOfDay, startOfDay, subDays } from 'date-fns';

type DetectorCounts = {
  billReminders: number;
  budgetAlerts: number;
  goalDeadlines: number;
  unusualExpenses: number;
  lowBalances: number;
};

function emptyCounts(): DetectorCounts {
  return {
    billReminders: 0,
    budgetAlerts: 0,
    goalDeadlines: 0,
    unusualExpenses: 0,
    lowBalances: 0,
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function detectUpcomingBills(userId: string, now = new Date()) {
  const preferences = await getOrCreateNotificationPreferences(userId);
  if (!preferences.billRemindersEnabled) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const from = startOfDay(now);
  const to = endOfDay(addDays(now, preferences.billReminderDaysBefore));

  const bills = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      type: 'EXPENSE',
      nextRunDate: { gte: from, lte: to },
    },
    orderBy: { nextRunDate: 'asc' },
  });

  let created = 0;
  for (const bill of bills) {
    const daysUntilDue = differenceInCalendarDays(bill.nextRunDate, now);
    const result = await createNotificationOnce(userId, {
      title: `${bill.description} due soon`,
      message: `${formatCurrency(Number(bill.amount), user?.currency || 'USD')} is scheduled for ${formatDate(bill.nextRunDate, 'MMM d')}.`,
      type: 'BILL_REMINDER',
      severity: daysUntilDue <= 1 ? 'WARNING' : 'INFO',
      sourceType: 'RECURRING_TRANSACTION',
      sourceId: bill.id,
      dedupeKey: `bill:${bill.id}:${dayKey(bill.nextRunDate)}:${preferences.billReminderDaysBefore}`,
      actionUrl: '/recurring',
    });
    if (result.created) created++;
  }

  return created;
}

export async function detectBudgetThresholds(userId: string, now = new Date()) {
  const preferences = await getOrCreateNotificationPreferences(userId);
  if (!preferences.budgetAlertsEnabled) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const budgets = await getBudgets(userId, month, year);
  let created = 0;

  for (const budget of budgets) {
    if (budget.effectiveAmount <= 0) continue;

    const thresholds = [
      { value: preferences.budgetWarningThreshold, severity: 'WARNING' as const },
      { value: preferences.budgetCriticalThreshold, severity: 'CRITICAL' as const },
    ];

    for (const threshold of thresholds) {
      if (budget.percentage < threshold.value) continue;

      const result = await createNotificationOnce(userId, {
        title: `${budget.categoryName} budget at ${budget.percentage}%`,
        message: `${formatCurrency(budget.spent, user?.currency || 'USD')} of ${formatCurrency(budget.effectiveAmount, user?.currency || 'USD')} used this month.`,
        type: 'BUDGET_ALERT',
        severity: threshold.severity,
        sourceType: 'BUDGET',
        sourceId: budget.id,
        dedupeKey: `budget:${budget.id}:${year}-${month}:${threshold.value}`,
        actionUrl: '/budgets',
      });
      if (result.created) created++;
    }
  }

  return created;
}

export async function detectGoalDeadlines(userId: string, now = new Date()) {
  const preferences = await getOrCreateNotificationPreferences(userId);
  if (!preferences.goalDeadlineEnabled) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const from = startOfDay(now);
  const to = endOfDay(addDays(now, preferences.goalReminderDaysBefore));
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      isCompleted: false,
      deadline: { gte: from, lte: to },
    },
    orderBy: { deadline: 'asc' },
  });

  let created = 0;
  for (const goal of goals) {
    const remaining = Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount));
    const daysLeft = Math.max(0, differenceInCalendarDays(goal.deadline, now));
    const result = await createNotificationOnce(userId, {
      title: `${goal.name} deadline approaching`,
      message: `${daysLeft} days left and ${formatCurrency(remaining, user?.currency || 'USD')} still needed.`,
      type: 'GOAL_DEADLINE',
      severity: daysLeft <= 3 ? 'CRITICAL' : 'WARNING',
      sourceType: 'GOAL',
      sourceId: goal.id,
      dedupeKey: `goal:${goal.id}:${dayKey(goal.deadline)}:${preferences.goalReminderDaysBefore}`,
      actionUrl: '/goals',
    });
    if (result.created) created++;
  }

  return created;
}

export async function detectUnusualExpenses(userId: string, transactionId?: string) {
  const preferences = await getOrCreateNotificationPreferences(userId);
  if (!preferences.unusualExpenseEnabled) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const minAmount = Number(preferences.unusualExpenseMinAmount);
  const multiplier = Number(preferences.unusualExpenseMultiplier);

  const transactions = transactionId
    ? await prisma.transaction.findMany({
        where: { id: transactionId, userId, type: 'EXPENSE' },
        include: { category: true },
      })
    : await prisma.transaction.findMany({
        where: {
          userId,
          type: 'EXPENSE',
          createdAt: { gte: subDays(new Date(), 1) },
        },
        include: { category: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

  let created = 0;
  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    if (amount < minAmount) continue;

    const history = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: transaction.categoryId,
        type: 'EXPENSE',
        id: { not: transaction.id },
        date: {
          gte: subDays(transaction.date, 90),
          lt: transaction.date,
        },
      },
      _avg: { amount: true },
      _count: { id: true },
    });

    const average = Number(history._avg.amount || 0);
    if (history._count.id < 3 || average <= 0 || amount < average * multiplier) continue;

    const result = await createNotificationOnce(userId, {
      title: `Unusual ${transaction.category.name} expense`,
      message: `${formatCurrency(amount, user?.currency || 'USD')} is higher than your recent ${transaction.category.name} average.`,
      type: 'UNUSUAL_EXPENSE',
      severity: 'WARNING',
      sourceType: 'TRANSACTION',
      sourceId: transaction.id,
      dedupeKey: `unusual-expense:${transaction.id}`,
      actionUrl: '/transactions',
    });
    if (result.created) created++;
  }

  return created;
}

export async function detectLowBalances(userId: string, now = new Date()) {
  const preferences = await getOrCreateNotificationPreferences(userId);
  if (!preferences.lowBalanceEnabled) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const threshold = Number(preferences.lowBalanceThreshold);
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      isActive: true,
      balance: { lt: threshold },
    },
    orderBy: { name: 'asc' },
  });

  let created = 0;
  for (const account of accounts) {
    const result = await createNotificationOnce(userId, {
      title: `${account.name} balance is low`,
      message: `Current balance is ${formatCurrency(Number(account.balance), user?.currency || 'USD')}, below your ${formatCurrency(threshold, user?.currency || 'USD')} threshold.`,
      type: 'LOW_BALANCE',
      severity: 'CRITICAL',
      sourceType: 'ACCOUNT',
      sourceId: account.id,
      dedupeKey: `low-balance:${account.id}:${threshold}:${dayKey(now)}`,
      actionUrl: '/accounts',
    });
    if (result.created) created++;
  }

  return created;
}

export async function runNotificationDetectors(userId?: string, now = new Date()) {
  const users = userId
    ? [{ id: userId }]
    : await prisma.user.findMany({ select: { id: true } });

  const totals = emptyCounts();
  for (const user of users) {
    totals.billReminders += await detectUpcomingBills(user.id, now);
    totals.budgetAlerts += await detectBudgetThresholds(user.id, now);
    totals.goalDeadlines += await detectGoalDeadlines(user.id, now);
    totals.unusualExpenses += await detectUnusualExpenses(user.id);
    totals.lowBalances += await detectLowBalances(user.id, now);
  }

  return totals;
}
