import { prisma } from '@/lib/prisma';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export async function getRecurringTransactions(userId: string) {
  return prisma.recurringTransaction.findMany({
    where: { userId },
    orderBy: { nextRunDate: 'asc' },
  });
}

export async function createRecurringTransaction(userId: string, data: {
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
    },
  });
}

export async function deleteRecurringTransaction(userId: string, id: string) {
  const rec = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!rec) throw new Error('Recurring transaction not found');
  await prisma.recurringTransaction.delete({ where: { id } });
  return true;
}

export async function toggleRecurring(userId: string, id: string) {
  const rec = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!rec) throw new Error('Not found');
  return prisma.recurringTransaction.update({
    where: { id },
    data: { isActive: !rec.isActive },
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
