import { prisma } from '@/lib/prisma';

export async function getAccounts(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const userIds = new Set<string>();
  accounts.forEach(a => {
    if (a.createdById) userIds.add(a.createdById);
    if (a.updatedById) userIds.add(a.updatedById);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  return accounts.map(a => ({
    ...a,
    createdByName: a.createdById ? userMap.get(a.createdById) || null : null,
    updatedByName: a.updatedById ? userMap.get(a.updatedById) || null : null,
  }));
}

export async function createAccount(userId: string, executorId: string, data: {
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
      createdById: executorId,
      updatedById: executorId,
    },
  });
}

export async function updateAccount(userId: string, executorId: string, id: string, data: {
  name?: string; type?: 'CASH' | 'BANK' | 'MOBILE_WALLET' | 'CREDIT_CARD' | 'INVESTMENT';
  color?: string; icon?: string;
}) {
  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) throw new Error('Account not found');

  return prisma.account.update({ 
    where: { id }, 
    data: { ...data, updatedById: executorId } 
  });
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
