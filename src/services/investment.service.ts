import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type { InvestmentCashflowType, InvestmentStatus, ReturnFrequency } from '@prisma/client';

type RawPrismaClient = Pick<typeof prisma, '$executeRaw' | '$queryRaw'>;

function getInvestmentTag(investmentId: string) {
  return `__pft:investment:${investmentId}`;
}

function getCashflowTag(cashflowId: string) {
  return `__pft:investment-cashflow:${cashflowId}`;
}

function getCashflowTypeTag(type: InvestmentCashflowType) {
  return `__pft:investment-flow:${type.toLowerCase()}`;
}

function getInvestmentTransactionTags(
  investmentId: string,
  cashflowId: string,
  type: InvestmentCashflowType
) {
  return [getInvestmentTag(investmentId), getCashflowTag(cashflowId), getCashflowTypeTag(type)];
}

function getReturnFrequency(value?: string): ReturnFrequency | null {
  return value ? (value as ReturnFrequency) : null;
}

function getCloseCashflowType(status: 'MATURED' | 'SOLD' | 'CANCELLED'): InvestmentCashflowType {
  if (status === 'MATURED') return 'MATURITY_PAYOUT';
  if (status === 'SOLD') return 'SALE';
  return 'REVERSAL';
}

async function getInvestmentTransferCategoryId(userId: string, executorId: string, type: 'INCOME' | 'EXPENSE') {
  const isIncome = type === 'INCOME';
  const name = isIncome ? 'Investment Sales & Returns' : 'Investments & DPS';
  const icon = isIncome ? 'trending-up' : 'piggy-bank';
  const color = isIncome ? '#10b981' : '#6366f1';

  const [category] = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "Category" ("id", "userId", "name", "type", "icon", "color", "isDefault", "createdAt", "createdById", "updatedById")
    VALUES (${randomUUID()}, ${userId}, ${name}, ${type}::"CategoryType", ${icon}, ${color}, true, NOW(), ${executorId}, ${executorId})
    ON CONFLICT ("userId", "name", "type") DO UPDATE SET "name" = EXCLUDED."name"
    RETURNING "id"
  `;

  return category.id;
}

async function createInvestmentCashflow(db: RawPrismaClient, data: {
  id: string;
  investmentId: string;
  transactionId?: string | null;
  accountId?: string | null;
  type: InvestmentCashflowType;
  amount: number;
  principalAmount?: number;
  returnAmount?: number;
  taxAmount?: number;
  date: Date;
  description?: string | null;
  createdById?: string | null;
}) {
  await db.$executeRaw`
    INSERT INTO "InvestmentCashflow" (
      "id", "investmentId", "transactionId", "accountId", "type",
      "amount", "principalAmount", "returnAmount", "taxAmount",
      "date", "description", "createdById"
    )
    VALUES (
      ${data.id}, ${data.investmentId}, ${data.transactionId ?? null}, ${data.accountId ?? null},
      ${data.type}::"InvestmentCashflowType", ${data.amount}, ${data.principalAmount ?? 0},
      ${data.returnAmount ?? 0}, ${data.taxAmount ?? 0}, ${data.date}, ${data.description ?? null},
      ${data.createdById ?? null}
    )
  `;
}

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

  const investmentId = randomUUID();
  const purchaseDate = new Date(data.purchaseDate);
  const maturityDate = data.maturityDate ? new Date(data.maturityDate) : null;
  const buyCashflowType: InvestmentCashflowType = 'BUY';
  const buyCashflowId = randomUUID();
  const baseInvestmentData = {
    id: investmentId,
    userId,
    typeConfigId: data.typeConfigId,
    name: data.name,
    institutionName: data.institutionName || null,
    accountNumber: data.accountNumber || null,
    investedAmount: data.investedAmount,
    currentValue: data.currentValue,
    interestRate: data.interestRate ?? null,
    returnFrequency: getReturnFrequency(data.returnFrequency),
    purchaseDate,
    maturityDate,
    monthlyInstallment: data.monthlyInstallment ?? null,
    quantity: data.quantity ?? null,
    avgBuyPrice: data.avgBuyPrice ?? null,
    notes: data.notes || null,
    color: data.color || typeConfig.color,
    icon: data.icon || typeConfig.icon,
    createdById: executorId,
    updatedById: executorId,
  };

  if (data.linkedAccountId) {
    const linkedAccountId = data.linkedAccountId;
    const account = await prisma.account.findFirst({
      where: { id: linkedAccountId, userId, isActive: true },
      select: { id: true, balance: true },
    });
    if (!account) throw new Error('Linked account not found');
    if (Number(account.balance) < data.investedAmount) throw new Error('Insufficient account balance');

    const categoryId = await getInvestmentTransferCategoryId(userId, executorId, 'EXPENSE');
    const transactionId = randomUUID();
    const cleanDescription = `Initial investment in ${data.name}`;

    return prisma.$transaction(async (tx) => {
      const accountUpdate = await tx.account.updateMany({
        where: { id: linkedAccountId, userId, isActive: true, balance: { gte: data.investedAmount } },
        data: { balance: { decrement: data.investedAmount }, updatedById: executorId },
      });
      if (accountUpdate.count !== 1) throw new Error('Insufficient account balance');

      const investment = await tx.investment.create({
        data: { ...baseInvestmentData, linkedAccountId },
        include: { typeConfig: true },
      });

      await tx.transaction.create({
        data: {
          id: transactionId,
          userId,
          accountId: linkedAccountId,
          categoryId,
          type: 'EXPENSE',
          amount: data.investedAmount,
          description: cleanDescription,
          date: purchaseDate,
          tags: getInvestmentTransactionTags(investmentId, buyCashflowId, buyCashflowType),
          isRecurring: false,
          createdById: executorId,
          updatedById: executorId,
        },
      });

      await createInvestmentCashflow(tx, {
        id: buyCashflowId,
        investmentId,
        transactionId,
        accountId: linkedAccountId,
        type: buyCashflowType,
        amount: data.investedAmount,
        principalAmount: data.investedAmount,
        date: purchaseDate,
        description: cleanDescription,
        createdById: executorId,
      });

      return investment;
    });
  }

  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.create({
      data: { ...baseInvestmentData, linkedAccountId: null },
      include: { typeConfig: true },
    });

    await createInvestmentCashflow(tx, {
      id: buyCashflowId,
      investmentId,
      type: buyCashflowType,
      amount: data.investedAmount,
      principalAmount: data.investedAmount,
      date: purchaseDate,
      description: `Initial investment in ${data.name}`,
      createdById: executorId,
    });

    return investment;
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
  purchaseDate?: string;
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
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : undefined,
      updatedById: executorId,
    },
    include: { typeConfig: true },
  });
}

export async function deleteInvestment(userId: string, id: string) {
  const investment = await prisma.investment.findFirst({ where: { id, userId } });
  if (!investment) throw new Error('Investment not found');

  const [linkedCashflows, returnHistory] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "InvestmentCashflow"
      WHERE "investmentId" = ${id}
        AND ("transactionId" IS NOT NULL OR "type" <> 'BUY'::"InvestmentCashflowType")
      LIMIT 1
    `,
    prisma.investmentReturn.findFirst({
      where: { investmentId: id },
      select: { id: true },
    }),
  ]);

  if (linkedCashflows.length > 0 || returnHistory) {
    throw new Error('Cannot delete an investment with linked financial history. Close it to preserve the audit trail.');
  }

  await prisma.investment.delete({ where: { id } });
  return true;
}

export async function addFunds(
  userId: string,
  executorId: string,
  id: string,
  accountId: string,
  amount: number,
  description?: string
) {
  const investment = await prisma.investment.findFirst({ where: { id, userId } });
  if (!investment) throw new Error('Investment not found');
  if (investment.status !== 'ACTIVE') throw new Error('Only active investments can receive additional funds');

  const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true }, select: { id: true, balance: true } });
  if (!account) throw new Error('Account not found');

  if (Number(account.balance) < amount) throw new Error('Insufficient account balance');

  const cleanDescription = description?.trim() || `Deposit to ${investment.name}`;
  const categoryId = await getInvestmentTransferCategoryId(userId, executorId, 'EXPENSE');
  const transactionId = randomUUID();
  const cashflowType: InvestmentCashflowType = 'ADD_FUNDS';
  const cashflowId = randomUUID();
  const flowDate = new Date();

  return prisma.$transaction(async (tx) => {
    const accountUpdate = await tx.account.updateMany({
      where: { id: accountId, userId, isActive: true, balance: { gte: amount } },
      data: { balance: { decrement: amount }, updatedById: executorId },
    });
    if (accountUpdate.count !== 1) throw new Error('Insufficient account balance');

    const updatedInvestment = await tx.investment.update({
      where: { id },
      data: {
        investedAmount: { increment: amount },
        currentValue: { increment: amount },
        updatedById: executorId,
      },
    });

    await tx.transaction.create({
      data: {
        id: transactionId,
        userId,
        accountId,
        categoryId,
        type: 'EXPENSE',
        amount,
        description: cleanDescription,
        date: flowDate,
        tags: getInvestmentTransactionTags(id, cashflowId, cashflowType),
        isRecurring: false,
        createdById: executorId,
        updatedById: executorId,
      },
    });

    await createInvestmentCashflow(tx, {
      id: cashflowId,
      investmentId: id,
      transactionId,
      accountId,
      type: cashflowType,
      amount,
      principalAmount: amount,
      date: flowDate,
      description: cleanDescription,
      createdById: executorId,
    });

    return updatedInvestment;
  });
}

export async function recordValuation(userId: string, executorId: string, id: string, data: {
  value: number;
  date: string;
}) {
  const investment = await prisma.investment.findFirst({ where: { id, userId } });
  if (!investment) throw new Error('Investment not found');
  if (investment.status !== 'ACTIVE') throw new Error('Only active investments can receive valuation updates');

  await prisma.$transaction([
    prisma.investmentValuation.create({
      data: {
        investmentId: id,
        value: data.value,
        date: new Date(data.date),
      },
    }),
    prisma.investment.update({
      where: { id },
      data: { currentValue: data.value, updatedById: executorId },
    }),
  ]);

  return true;
}

export async function recordReturn(userId: string, executorId: string, investmentId: string, data: {
  amount: number;
  type: string;
  description?: string;
  date: string;
  accountId?: string;
}) {
  const investment = await prisma.investment.findFirst({ where: { id: investmentId, userId } });
  if (!investment) throw new Error('Investment not found');
  if (investment.status !== 'ACTIVE') throw new Error('Only active investments can record returns');

  const accountId = data.accountId?.trim() || undefined;
  const returnDate = new Date(data.date);
  const cashflowType: InvestmentCashflowType = 'RETURN';
  const cashflowId = randomUUID();
  const transactionId = accountId ? randomUUID() : undefined;
  const cleanDescription = data.description?.trim() || `${data.type.replace(/_/g, ' ')} from ${investment.name}`;

  let categoryId: string | undefined;
  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, isActive: true },
      select: { id: true },
    });
    if (!account) throw new Error('Deposit account not found');
    categoryId = await getInvestmentTransferCategoryId(userId, executorId, 'INCOME');
  }

  return prisma.$transaction(async (tx) => {
    const ret = await tx.investmentReturn.create({
      data: {
        investmentId,
        amount: data.amount,
        type: data.type,
        description: data.description || null,
        date: returnDate,
      },
    });

    if (accountId && transactionId && categoryId) {
      await tx.transaction.create({
        data: {
          id: transactionId,
          userId,
          accountId,
          categoryId,
          type: 'INCOME',
          amount: data.amount,
          description: cleanDescription,
          date: returnDate,
          tags: getInvestmentTransactionTags(investmentId, cashflowId, cashflowType),
          isRecurring: false,
          createdById: executorId,
          updatedById: executorId,
        },
      });

      const accountUpdate = await tx.account.updateMany({
        where: { id: accountId, userId, isActive: true },
        data: { balance: { increment: data.amount }, updatedById: executorId },
      });
      if (accountUpdate.count !== 1) throw new Error('Deposit account not found');
    }

    await createInvestmentCashflow(tx, {
      id: cashflowId,
      investmentId,
      transactionId: transactionId || null,
      accountId: accountId || null,
      type: cashflowType,
      amount: data.amount,
      returnAmount: data.amount,
      date: returnDate,
      description: cleanDescription,
      createdById: executorId,
    });

    return ret;
  });
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

export async function closeInvestment(userId: string, executorId: string, id: string, data: {
  status: 'MATURED' | 'SOLD' | 'CANCELLED';
  closeDate: string;
  finalValue: number;
  linkedAccountId?: string;
  description?: string;
}) {
  const investment = await prisma.investment.findFirst({
    where: { id, userId },
    include: { typeConfig: true },
  });
  if (!investment) throw new Error('Investment not found');
  if (investment.status !== 'ACTIVE') throw new Error('Investment is already closed');
  if (data.finalValue < 0) throw new Error('Final value cannot be negative');

  const closeDate = new Date(data.closeDate);
  const cleanDescription = data.description?.trim() || `${data.status}: ${investment.name}`;
  const cashflowType = getCloseCashflowType(data.status);
  const cashflowId = randomUUID();
  const transactionId = data.finalValue > 0 && data.linkedAccountId ? randomUUID() : undefined;
  const investedAmount = Number(investment.investedAmount);
  const principalAmount = investedAmount;
  const returnAmount = data.finalValue - investedAmount;
  let categoryId: string | undefined;

  if (data.finalValue > 0 && data.linkedAccountId) {
    const account = await prisma.account.findFirst({
      where: { id: data.linkedAccountId, userId, isActive: true },
      select: { id: true },
    });
    if (!account) throw new Error('Payout account not found');
    categoryId = await getInvestmentTransferCategoryId(userId, executorId, 'INCOME');
  }

  return prisma.$transaction(async (tx) => {
    const updatedInvestment = await tx.investment.update({
      where: { id },
      data: {
        status: data.status as InvestmentStatus,
        currentValue: data.finalValue,
        soldDate: closeDate,
        updatedById: executorId,
      },
    });

    if (data.finalValue > 0 && data.linkedAccountId && transactionId && categoryId) {
      await tx.transaction.create({
        data: {
          id: transactionId,
          userId,
          accountId: data.linkedAccountId,
          categoryId,
          type: 'INCOME',
          amount: data.finalValue,
          description: cleanDescription,
          date: closeDate,
          tags: getInvestmentTransactionTags(id, cashflowId, cashflowType),
          isRecurring: false,
          createdById: executorId,
          updatedById: executorId,
        },
      });

      const accountUpdate = await tx.account.updateMany({
        where: { id: data.linkedAccountId, userId, isActive: true },
        data: { balance: { increment: data.finalValue }, updatedById: executorId },
      });
      if (accountUpdate.count !== 1) throw new Error('Payout account not found');
    }

    await createInvestmentCashflow(tx, {
      id: cashflowId,
      investmentId: id,
      transactionId: transactionId || null,
      accountId: data.finalValue > 0 ? data.linkedAccountId || null : null,
      type: cashflowType,
      amount: data.finalValue,
      principalAmount,
      returnAmount,
      date: closeDate,
      description: cleanDescription,
      createdById: executorId,
    });

    return updatedInvestment;
  });
}

export async function getPortfolioGrowth(userId: string) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      date: d,
      month: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      totalValue: 0,
    };
  });

  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { valuations: true },
  });

  // For each month, calculate total value
  const growth = months.map(m => {
    const monthEnd = new Date(m.year, m.date.getMonth() + 1, 0, 23, 59, 59);
    
    let totalValue = 0;
    for (const inv of investments) {
      // If investment was purchased before or during this month
      if (new Date(inv.purchaseDate) <= monthEnd) {
        // Find the latest valuation before this monthEnd
        const valuationsBefore = inv.valuations.filter(v => new Date(v.date) <= monthEnd);
        if (valuationsBefore.length > 0) {
          const latestValuation = valuationsBefore.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          totalValue += Number(latestValuation.value);
        } else {
          // If no valuations, use original invested amount
          totalValue += Number(inv.investedAmount);
        }
      }
    }

    return {
      name: m.month,
      value: totalValue,
    };
  });

  return growth;
}
