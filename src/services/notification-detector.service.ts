import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getBudgets } from '@/services/budget.service';
import { createNotificationOnce, getOrCreateNotificationPreferences } from '@/services/notification.service';
import { addDays, differenceInCalendarDays, endOfDay, startOfDay, subDays } from 'date-fns';
import { getCurrentFinancialMonthYear, normalizeFinancialMonthStartDay } from '@/lib/financial-period';

type DetectorCounts = {
  billReminders: number;
  budgetAlerts: number;
  goalDeadlines: number;
  unusualExpenses: number;
  lowBalances: number;
  investmentMaturities: number;
  dpsReminders: number;
};

function emptyCounts(): DetectorCounts {
  return {
    billReminders: 0,
    budgetAlerts: 0,
    goalDeadlines: 0,
    unusualExpenses: 0,
    lowBalances: 0,
    investmentMaturities: 0,
    dpsReminders: 0,
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function clampDueDay(value?: number | null) {
  if (!Number.isFinite(Number(value))) return 5;
  return Math.min(31, Math.max(1, Math.trunc(Number(value))));
}

function getInstallmentDueDate(year: number, month: number, dueDay?: number | null) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return startOfDay(new Date(year, month, Math.min(clampDueDay(dueDay), lastDay)));
}

function getFirstInstallmentDueDate(purchaseDate: Date, dueDay?: number | null) {
  const purchaseDay = startOfDay(purchaseDate);
  let dueDate = getInstallmentDueDate(purchaseDate.getFullYear(), purchaseDate.getMonth(), dueDay);
  if (dueDate < purchaseDay) {
    dueDate = getInstallmentDueDate(purchaseDate.getFullYear(), purchaseDate.getMonth() + 1, dueDay);
  }
  return dueDate;
}

function getNextInstallmentDueDate(dueDate: Date, dueDay?: number | null) {
  return getInstallmentDueDate(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDay);
}

function getPaidInstallmentMonthKeys(cashflows: Array<{
  type: string;
  date: Date;
  installmentDueDate?: Date | null;
}>) {
  return new Set(
    cashflows
      .filter((cashflow) => cashflow.type === 'INSTALLMENT' || cashflow.type === 'ADD_FUNDS')
      .map((cashflow) => monthKey(cashflow.installmentDueDate || cashflow.date))
  );
}

function getUnpaidInstallmentDueDates(investment: {
  purchaseDate: Date;
  installmentDueDay?: number | null;
  cashflows: Array<{ type: string; date: Date; installmentDueDate?: Date | null }>;
}, now: Date) {
  const today = startOfDay(now);
  const paidMonthKeys = getPaidInstallmentMonthKeys(investment.cashflows);
  const unpaidDueDates: Date[] = [];
  let dueDate = getFirstInstallmentDueDate(investment.purchaseDate, investment.installmentDueDay);
  let guard = 0;

  while (dueDate <= today && guard < 360) {
    if (!paidMonthKeys.has(monthKey(dueDate))) unpaidDueDates.push(dueDate);
    dueDate = getNextInstallmentDueDate(dueDate, investment.installmentDueDay);
    guard++;
  }

  return unpaidDueDates;
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
      message: `${formatCurrency(Number(bill.amount), user?.currency || 'BDT')} is scheduled for ${formatDate(bill.nextRunDate, 'MMM d')}.`,
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, financialMonthStartDay: true },
  });
  const startDay = normalizeFinancialMonthStartDay(user?.financialMonthStartDay);
  const { month, year } = getCurrentFinancialMonthYear(now, startDay);
  const budgets = await getBudgets(userId, month, year, startDay);
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
        message: `${formatCurrency(budget.spent, user?.currency || 'BDT')} of ${formatCurrency(budget.effectiveAmount, user?.currency || 'BDT')} used this month.`,
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
      message: `${daysLeft} days left and ${formatCurrency(remaining, user?.currency || 'BDT')} still needed.`,
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
      message: `${formatCurrency(amount, user?.currency || 'BDT')} is higher than your recent ${transaction.category.name} average.`,
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
      message: `Current balance is ${formatCurrency(Number(account.balance), user?.currency || 'BDT')}, below your ${formatCurrency(threshold, user?.currency || 'BDT')} threshold.`,
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

export async function detectInvestmentMaturities(userId: string, now = new Date()) {
  const preferences = await getOrCreateNotificationPreferences(userId);
  if (!preferences.investmentMaturityEnabled) return 0;

  const from = startOfDay(now);
  const to = endOfDay(addDays(now, preferences.investmentReminderDaysBefore));

  const investments = await prisma.investment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      maturityDate: { gte: from, lte: to },
    },
    include: { typeConfig: true },
    orderBy: { maturityDate: 'asc' },
  });

  let created = 0;
  for (const inv of investments) {
    if (!inv.maturityDate) continue;
    
    const daysUntil = differenceInCalendarDays(inv.maturityDate, now);
    const result = await createNotificationOnce(userId, {
      title: `${inv.name} maturing soon`,
      message: `${inv.typeConfig.name} investment is maturing on ${formatDate(inv.maturityDate)}.`,
      type: 'INVESTMENT_MATURITY',
      severity: daysUntil <= 2 ? 'CRITICAL' : 'WARNING',
      sourceType: 'INVESTMENT',
      sourceId: inv.id,
      dedupeKey: `inv-maturity:${inv.id}:${dayKey(inv.maturityDate)}:${preferences.investmentReminderDaysBefore}`,
      actionUrl: '/investments',
    });
    if (result.created) created++;
  }

  return created;
}

export async function detectDPSReminders(userId: string, now = new Date()) {
  const preferences = await getOrCreateNotificationPreferences(userId);
  if (!preferences.dpsReminderEnabled) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
  const dpsInvestments = await prisma.investment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      typeConfig: { hasMonthlyInstallment: true },
      monthlyInstallment: { gt: 0 },
    },
    include: {
      typeConfig: true,
      cashflows: {
        where: { type: { in: ['INSTALLMENT', 'ADD_FUNDS'] } },
        select: { type: true, date: true, installmentDueDate: true },
      },
    },
  });

  let created = 0;

  for (const inv of dpsInvestments) {
    const unpaidDueDates = getUnpaidInstallmentDueDates(inv, now);
    if (unpaidDueDates.length === 0) continue;

    const dueDate = unpaidDueDates[0];
    const missedDueDates = unpaidDueDates.filter((date) => date < startOfDay(now));
    const daysLate = Math.max(0, differenceInCalendarDays(now, dueDate));
    await prisma.investment.updateMany({
      where: { id: inv.id, userId },
      data: {
        missedInstallmentCount: missedDueDates.length,
        lastMissedInstallmentOn: missedDueDates[0] || null,
      },
    });

    const result = await createNotificationOnce(userId, {
      title: `DPS payment due: ${inv.name}`,
      message: `${unpaidDueDates.length} installment${unpaidDueDates.length > 1 ? 's are' : ' is'} unpaid. Next due: ${formatCurrency(Number(inv.monthlyInstallment), user?.currency || 'BDT')} on ${formatDate(dueDate, 'MMM d')}.`,
      type: 'INVESTMENT_RETURN_DUE',
      severity: daysLate >= 5 ? 'CRITICAL' : 'WARNING',
      sourceType: 'INVESTMENT',
      sourceId: inv.id,
      dedupeKey: `dps-due:${inv.id}:${monthKey(dueDate)}`,
      actionUrl: `/investments/portfolio?payInstallment=${inv.id}`,
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
    totals.investmentMaturities += await detectInvestmentMaturities(user.id, now);
    totals.dpsReminders += await detectDPSReminders(user.id, now);
  }

  return totals;
}
