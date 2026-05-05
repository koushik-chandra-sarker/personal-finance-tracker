import { prisma } from '@/lib/prisma';

export async function getInvestments(userId: string, filters?: {
  typeConfigId?: string;
  status?: string;
  search?: string;
}) {
  const where: Record<string, unknown> = { userId };

  if (filters?.typeConfigId) where.typeConfigId = filters.typeConfigId;
  if (filters?.status) where.status = filters.status;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { institutionName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const investments = await prisma.investment.findMany({
    where,
    include: {
      typeConfig: true,
      linkedAccount: { select: { id: true, name: true } },
      _count: { select: { returns: true, valuations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return investments;
}

export async function getInvestmentById(userId: string, id: string) {
  const investment = await prisma.investment.findFirst({
    where: { id, userId },
    include: {
      typeConfig: true,
      linkedAccount: { select: { id: true, name: true } },
      returns: { orderBy: { date: 'desc' }, take: 20 },
      valuations: { orderBy: { date: 'desc' }, take: 20 },
    },
  });
  if (!investment) throw new Error('Investment not found');
  return investment;
}

export async function createInvestment(userId: string, executorId: string, data: {
  name: string;
  typeConfigId: string;
  institutionName?: string;
  accountNumber?: string;
  investedAmount: number;
  currentValue: number;
  interestRate?: number;
  returnFrequency?: string;
  purchaseDate: string;
  maturityDate?: string;
  linkedAccountId?: string;
  monthlyInstallment?: number;
  quantity?: number;
  avgBuyPrice?: number;
  notes?: string;
  color?: string;
  icon?: string;
}) {
  // Validate type config exists
  const typeConfig = await prisma.investmentTypeConfig.findFirst({
    where: {
      id: data.typeConfigId,
      OR: [{ userId }, { isSystem: true, userId: null }],
      isActive: true,
    },
  });
  if (!typeConfig) throw new Error('Invalid investment type');

  if (data.linkedAccountId) {
    const account = await prisma.account.findFirst({
      where: { id: data.linkedAccountId, userId, isActive: true },
    });
    if (!account) throw new Error('Linked account not found');
  }

  return prisma.investment.create({
    data: {
      userId,
      typeConfigId: data.typeConfigId,
      name: data.name,
      institutionName: data.institutionName || null,
      accountNumber: data.accountNumber || null,
      investedAmount: data.investedAmount,
      currentValue: data.currentValue,
      interestRate: data.interestRate ?? null,
      returnFrequency: data.returnFrequency as never,
      purchaseDate: new Date(data.purchaseDate),
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
      linkedAccountId: data.linkedAccountId || null,
      monthlyInstallment: data.monthlyInstallment ?? null,
      quantity: data.quantity ?? null,
      avgBuyPrice: data.avgBuyPrice ?? null,
      notes: data.notes || null,
      color: data.color || typeConfig.color,
      icon: data.icon || typeConfig.icon,
      createdById: executorId,
      updatedById: executorId,
    },
    include: { typeConfig: true },
  });
}

export async function updateInvestment(userId: string, executorId: string, id: string, data: {
  name?: string;
  institutionName?: string;
  accountNumber?: string;
  investedAmount?: number;
  currentValue?: number;
  interestRate?: number;
  returnFrequency?: string;
  maturityDate?: string;
  linkedAccountId?: string;
  monthlyInstallment?: number;
  quantity?: number;
  avgBuyPrice?: number;
  notes?: string;
  color?: string;
  icon?: string;
  status?: string;
}) {
  const investment = await prisma.investment.findFirst({ where: { id, userId } });
  if (!investment) throw new Error('Investment not found');

  return prisma.investment.update({
    where: { id },
    data: {
      ...data,
      returnFrequency: data.returnFrequency as never,
      status: data.status as never,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : undefined,
      updatedById: executorId,
    },
    include: { typeConfig: true },
  });
}

export async function deleteInvestment(userId: string, id: string) {
  const investment = await prisma.investment.findFirst({ where: { id, userId } });
  if (!investment) throw new Error('Investment not found');
  await prisma.investment.delete({ where: { id } });
  return true;
}

export async function recordReturn(userId: string, executorId: string, investmentId: string, data: {
  amount: number;
  type: string;
  description?: string;
  date: string;
}) {
  const investment = await prisma.investment.findFirst({ where: { id: investmentId, userId } });
  if (!investment) throw new Error('Investment not found');

  const ret = await prisma.investmentReturn.create({
    data: {
      investmentId,
      amount: data.amount,
      type: data.type,
      description: data.description || null,
      date: new Date(data.date),
    },
  });

  return ret;
}

export async function getPortfolioSummary(userId: string) {
  const investments = await prisma.investment.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { investedAmount: true, currentValue: true },
  });

  const totalReturns = await prisma.investmentReturn.aggregate({
    where: { investment: { userId, status: 'ACTIVE' } },
    _sum: { amount: true },
  });

  const totalInvested = investments.reduce((sum, i) => sum + Number(i.investedAmount), 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + Number(i.currentValue), 0);
  const totalReturnsAmount = Number(totalReturns._sum.amount || 0);
  const unrealisedGainLoss = totalCurrentValue - totalInvested;
  const activeCount = investments.length;

  return {
    totalInvested,
    totalCurrentValue,
    totalReturns: totalReturnsAmount,
    unrealisedGainLoss,
    activeCount,
  };
}

export async function getPortfolioAllocation(userId: string) {
  const investments = await prisma.investment.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { typeConfig: { select: { name: true, color: true, icon: true } } },
  });

  const allocationMap = new Map<string, { name: string; color: string; icon: string; total: number }>();

  for (const inv of investments) {
    const key = inv.typeConfigId;
    const existing = allocationMap.get(key);
    if (existing) {
      existing.total += Number(inv.currentValue);
    } else {
      allocationMap.set(key, {
        name: inv.typeConfig.name,
        color: inv.typeConfig.color,
        icon: inv.typeConfig.icon,
        total: Number(inv.currentValue),
      });
    }
  }

  const totalValue = Array.from(allocationMap.values()).reduce((s, a) => s + a.total, 0);

  return Array.from(allocationMap.entries()).map(([id, data]) => ({
    typeConfigId: id,
    name: data.name,
    color: data.color,
    icon: data.icon,
    total: data.total,
    percentage: totalValue > 0 ? Math.round((data.total / totalValue) * 100) : 0,
  }));
}

export async function getUpcomingMaturities(userId: string, daysAhead: number = 90) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return prisma.investment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      maturityDate: { gte: now, lte: futureDate },
    },
    include: { typeConfig: { select: { name: true, color: true, icon: true } } },
    orderBy: { maturityDate: 'asc' },
  });
}
