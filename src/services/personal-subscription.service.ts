import { prisma } from '@/lib/prisma';
import { addMonths, addWeeks, addYears } from 'date-fns';
import type { PersonalSubscriptionCycle, PersonalSubscriptionStatus, Prisma } from '@prisma/client';
import { detectUnusualExpenses } from '@/services/notification-detector.service';

export type PersonalSubscriptionData = {
  name: string;
  provider: string;
  planName?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  amount: number;
  currency: string;
  billingCycle: PersonalSubscriptionCycle;
  nextBillingDate: string;
  status: PersonalSubscriptionStatus;
  autoRenew: boolean;
  reminderDays: number;
  websiteUrl?: string | null;
  notes?: string | null;
  color: string;
};

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getNextBillingDate(current: Date, cycle: PersonalSubscriptionCycle) {
  switch (cycle) {
    case 'WEEKLY':
      return addWeeks(current, 1);
    case 'QUARTERLY':
      return addMonths(current, 3);
    case 'YEARLY':
      return addYears(current, 1);
    case 'CUSTOM':
    case 'MONTHLY':
    default:
      return addMonths(current, 1);
  }
}

async function ensureSubscriptionExpenseCategory(tx: Prisma.TransactionClient, userId: string, executorId?: string) {
  return tx.category.upsert({
    where: {
      userId_name_type: {
        userId,
        name: 'Subscriptions',
        type: 'EXPENSE',
      },
    },
    update: {},
    create: {
      userId,
      name: 'Subscriptions',
      type: 'EXPENSE',
      icon: 'credit-card',
      color: '#6366f1',
      isDefault: true,
      createdById: executorId,
      updatedById: executorId,
    },
    select: { id: true },
  });
}

export async function getPersonalSubscriptions(userId: string) {
  return prisma.personalSubscription.findMany({
    where: { userId },
    include: {
      account: { select: { id: true, name: true, type: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: [
      { status: 'asc' },
      { nextBillingDate: 'asc' },
      { name: 'asc' },
    ],
  });
}

export async function createPersonalSubscription(userId: string, executorId: string, data: PersonalSubscriptionData) {
  const accountId = cleanOptional(data.accountId);
  const categoryId = cleanOptional(data.categoryId);
  if (accountId) {
    const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true }, select: { id: true } });
    if (!account) throw new Error('Account not found.');
  }
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId, type: 'EXPENSE' }, select: { id: true } });
    if (!category) throw new Error('Expense category not found.');
  }

  return prisma.personalSubscription.create({
    data: {
      userId,
      accountId,
      categoryId,
      name: data.name.trim(),
      provider: data.provider.trim(),
      planName: cleanOptional(data.planName),
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      billingCycle: data.billingCycle,
      nextBillingDate: new Date(data.nextBillingDate),
      status: data.status,
      autoRenew: data.autoRenew,
      reminderDays: data.reminderDays,
      websiteUrl: cleanOptional(data.websiteUrl),
      notes: cleanOptional(data.notes),
      color: data.color || '#6366f1',
      createdById: executorId,
      updatedById: executorId,
    },
  });
}

export async function updatePersonalSubscription(userId: string, executorId: string, id: string, data: PersonalSubscriptionData) {
  const subscription = await prisma.personalSubscription.findFirst({ where: { id, userId }, select: { id: true } });
  if (!subscription) throw new Error('Subscription not found.');

  const accountId = cleanOptional(data.accountId);
  const categoryId = cleanOptional(data.categoryId);
  if (accountId) {
    const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true }, select: { id: true } });
    if (!account) throw new Error('Account not found.');
  }
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId, type: 'EXPENSE' }, select: { id: true } });
    if (!category) throw new Error('Expense category not found.');
  }

  return prisma.personalSubscription.update({
    where: { id },
    data: {
      accountId,
      categoryId,
      name: data.name.trim(),
      provider: data.provider.trim(),
      planName: cleanOptional(data.planName),
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      billingCycle: data.billingCycle,
      nextBillingDate: new Date(data.nextBillingDate),
      status: data.status,
      autoRenew: data.autoRenew,
      reminderDays: data.reminderDays,
      websiteUrl: cleanOptional(data.websiteUrl),
      notes: cleanOptional(data.notes),
      color: data.color || '#6366f1',
      updatedById: executorId,
    },
  });
}

export async function deletePersonalSubscription(userId: string, id: string) {
  const subscription = await prisma.personalSubscription.findFirst({ where: { id, userId }, select: { id: true } });
  if (!subscription) throw new Error('Subscription not found.');
  await prisma.personalSubscription.delete({ where: { id } });
}

export async function togglePersonalSubscriptionStatus(userId: string, executorId: string, id: string) {
  const subscription = await prisma.personalSubscription.findFirst({ where: { id, userId }, select: { id: true, status: true } });
  if (!subscription) throw new Error('Subscription not found.');

  return prisma.personalSubscription.update({
    where: { id },
    data: {
      status: subscription.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
      updatedById: executorId,
    },
  });
}

type ProcessPersonalSubscriptionOptions = {
  userId?: string;
  executorId?: string;
};

const MAX_SUBSCRIPTION_PAYMENTS_PER_RUN = 120;

export async function processDuePersonalSubscriptions(options: ProcessPersonalSubscriptionOptions = {}) {
  const now = new Date();
  const dueSubscriptions = await prisma.personalSubscription.findMany({
    where: {
      status: 'ACTIVE',
      autoRenew: true,
      accountId: { not: null },
      nextBillingDate: { lte: now },
      ...(options.userId ? { userId: options.userId } : {}),
    },
    orderBy: { nextBillingDate: 'asc' },
  });

  let processed = 0;

  for (const subscription of dueSubscriptions) {
    if (!subscription.accountId) continue;
    let dueDate = subscription.nextBillingDate;

    while (dueDate <= now && processed < MAX_SUBSCRIPTION_PAYMENTS_PER_RUN) {
      const nextBillingDate = getNextBillingDate(dueDate, subscription.billingCycle);
      const created = await prisma.$transaction(async (tx) => {
        const claimed = await tx.personalSubscription.updateMany({
          where: {
            id: subscription.id,
            status: 'ACTIVE',
            autoRenew: true,
            accountId: { not: null },
            nextBillingDate: dueDate,
            ...(options.userId ? { userId: options.userId } : {}),
          },
          data: {
            nextBillingDate,
            ...(options.executorId ? { updatedById: options.executorId } : {}),
          },
        });

        if (claimed.count === 0 || !subscription.accountId) return null;

        const categoryId = subscription.categoryId
          || (await ensureSubscriptionExpenseCategory(tx, subscription.userId, options.executorId)).id;

        const transaction = await tx.transaction.create({
          data: {
            userId: subscription.userId,
            accountId: subscription.accountId,
            categoryId,
            type: 'EXPENSE',
            amount: subscription.amount,
            description: `${subscription.name} subscription payment`,
            date: dueDate,
            tags: [
              'subscription',
              subscription.provider,
              `__pft:personal-subscription:${subscription.id}`,
              `__pft:personal-subscription-date:${dueDate.toISOString().split('T')[0]}`,
            ],
            notes: subscription.notes,
            isRecurring: true,
            ...(options.executorId ? {
              createdById: options.executorId,
              updatedById: options.executorId,
            } : {}),
          },
        });

        const updatedAccount = await tx.account.updateMany({
          where: { id: subscription.accountId, userId: subscription.userId, isActive: true },
          data: {
            balance: { decrement: Number(subscription.amount) },
            ...(options.executorId ? { updatedById: options.executorId } : {}),
          },
        });

        if (updatedAccount.count === 0) {
          throw new Error(`Payment account is not available for ${subscription.name}.`);
        }

        return transaction;
      });

      if (!created) break;

      processed += 1;
      try {
        await detectUnusualExpenses(subscription.userId, created.id);
      } catch (error) {
        console.error('Failed to detect unusual subscription expense:', error);
      }

      dueDate = nextBillingDate;
    }
  }

  return processed;
}
