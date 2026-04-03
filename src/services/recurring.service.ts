import { prisma } from '@/lib/prisma';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export async function getRecurringTransactions(userId: string) {
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId },
    orderBy: { nextRunDate: 'asc' },
  });

  const userIds = new Set<string>();
  recurring.forEach(r => {
    if (r.createdById) userIds.add(r.createdById);
    if (r.updatedById) userIds.add(r.updatedById);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  return recurring.map(r => ({
    ...r,
    createdByName: r.createdById ? userMap.get(r.createdById) || null : null,
    updatedByName: r.updatedById ? userMap.get(r.updatedById) || null : null,
  }));
}

export async function createRecurringTransaction(userId: string, executorId: string, data: {
  accountId: string; categoryId: string; type: 'INCOME' | 'EXPENSE';
  amount: number; description: string; frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  nextRunDate: string;
}) {
  return prisma.recurringTransaction.create({
    data: {
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      frequency: data.frequency,
      nextRunDate: new Date(data.nextRunDate),
      createdById: executorId,
      updatedById: executorId,
    },
  });
}

export async function deleteRecurringTransaction(userId: string, id: string) {
  const rec = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!rec) throw new Error('Recurring transaction not found');
  await prisma.recurringTransaction.delete({ where: { id } });
  return true;
}

export async function toggleRecurring(userId: string, executorId: string, id: string) {
  const rec = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!rec) throw new Error('Not found');
  return prisma.recurringTransaction.update({
    where: { id },
    data: { 
      isActive: !rec.isActive,
      updatedById: executorId,
    },
  });
}

function getNextDate(current: Date, frequency: string): Date {
  switch (frequency) {
    case 'DAILY': return addDays(current, 1);
    case 'WEEKLY': return addWeeks(current, 1);
    case 'BIWEEKLY': return addWeeks(current, 2);
    case 'MONTHLY': return addMonths(current, 1);
    case 'QUARTERLY': return addMonths(current, 3);
    case 'YEARLY': return addYears(current, 1);
    default: return addMonths(current, 1);
  }
}

export async function processRecurringTransactions() {
  const now = new Date();
  const dueTransactions = await prisma.recurringTransaction.findMany({
    where: { isActive: true, nextRunDate: { lte: now } },
  });

  for (const rec of dueTransactions) {
    // Create the transaction
    await prisma.transaction.create({
      data: {
        userId: rec.userId,
        accountId: rec.accountId,
        categoryId: rec.categoryId,
        type: rec.type,
        amount: rec.amount,
        description: rec.description,
        date: rec.nextRunDate,
        isRecurring: true,
      },
    });

    // Update account balance
    const balanceChange = rec.type === 'INCOME' ? Number(rec.amount) : -Number(rec.amount);
    await prisma.account.update({
      where: { id: rec.accountId },
      data: { balance: { increment: balanceChange } },
    });

    // Advance next run date
    await prisma.recurringTransaction.update({
      where: { id: rec.id },
      data: { nextRunDate: getNextDate(rec.nextRunDate, rec.frequency) },
    });
  }

  return dueTransactions.length;
}
