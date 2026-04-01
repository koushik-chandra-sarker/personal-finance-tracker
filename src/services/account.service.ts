import { prisma } from '@/lib/prisma';

export async function getAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createAccount(userId: string, data: {
  name: string; type: 'CASH' | 'BANK' | 'MOBILE_WALLET' | 'CREDIT_CARD' | 'INVESTMENT';
  balance?: number; currency?: string; color?: string; icon?: string;
}) {
  return prisma.account.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      balance: data.balance || 0,
      currency: data.currency || 'USD',
      color: data.color || '#6366f1',
      icon: data.icon || 'wallet',
    },
  });
}

export async function updateAccount(userId: string, id: string, data: {
  name?: string; type?: 'CASH' | 'BANK' | 'MOBILE_WALLET' | 'CREDIT_CARD' | 'INVESTMENT';
  color?: string; icon?: string;
}) {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw new Error('Account not found');

  return prisma.account.update({ where: { id }, data });
}

export async function deleteAccount(userId: string, id: string) {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw new Error('Account not found');

  await prisma.account.update({ where: { id }, data: { isActive: false } });
  return true;
}

export async function getTotalBalance(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    select: { balance: true },
  });
  return accounts.reduce((sum, a) => sum + Number(a.balance), 0);
}
