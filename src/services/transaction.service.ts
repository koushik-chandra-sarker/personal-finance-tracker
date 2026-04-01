import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { TransactionFilters } from '@/types';

export async function getTransactions(userId: string, filters: TransactionFilters = {}) {
  const { search, categoryId, accountId, type, dateFrom, dateTo, tags, page = 1, limit = 20 } = filters;

  const where: Prisma.TransactionWhereInput = { userId };

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (accountId) where.accountId = accountId;
  if (type) where.type = type;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions, total, pages: Math.ceil(total / limit) };
}

export async function createTransaction(userId: string, data: {
  accountId: string; categoryId: string; type: 'INCOME' | 'EXPENSE';
  amount: number; description: string; date: string; tags?: string[]; notes?: string;
}) {
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      tags: data.tags || [],
      notes: data.notes,
    },
    include: { category: true, account: true },
  });

  // Update account balance
  const balanceChange = data.type === 'INCOME' ? data.amount : -data.amount;
  await prisma.account.update({
    where: { id: data.accountId },
    data: { balance: { increment: balanceChange } },
  });

  return transaction;
}

export async function updateTransaction(userId: string, id: string, data: {
  accountId: string; categoryId: string; type: 'INCOME' | 'EXPENSE';
  amount: number; description: string; date: string; tags?: string[]; notes?: string;
}) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new Error('Transaction not found');

  // Reverse old balance change
  const oldBalanceChange = existing.type === 'INCOME' ? -Number(existing.amount) : Number(existing.amount);
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: oldBalanceChange } },
  });

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      tags: data.tags || [],
      notes: data.notes,
    },
    include: { category: true, account: true },
  });

  // Apply new balance change
  const newBalanceChange = data.type === 'INCOME' ? data.amount : -data.amount;
  await prisma.account.update({
    where: { id: data.accountId },
    data: { balance: { increment: newBalanceChange } },
  });

  return transaction;
}

export async function deleteTransaction(userId: string, id: string) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) throw new Error('Transaction not found');

  // Reverse balance change
  const balanceChange = transaction.type === 'INCOME' ? -Number(transaction.amount) : Number(transaction.amount);
  await prisma.account.update({
    where: { id: transaction.accountId },
    data: { balance: { increment: balanceChange } },
  });

  await prisma.transaction.delete({ where: { id } });
  return true;
}
