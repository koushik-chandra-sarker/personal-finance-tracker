import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type { InvestmentCashflowType, InvestmentStatus, Prisma, ReturnFrequency } from '@prisma/client';

type RawPrismaClient = Pick<typeof prisma, '$executeRaw' | '$queryRaw'>;
type NumericLike = Prisma.Decimal | number | string | null | undefined;
type ProjectionCashflow = {
  type: InvestmentCashflowType;
  amount: NumericLike;
  date: Date;
  installmentDueDate?: Date | null;
};
type ProjectionSanchayapatraConfig = {
  id: string;
  name: string;
  rate: NumericLike;
  taxThreshold: NumericLike;
  taxRateBelow: NumericLike;
  taxRateAbove: NumericLike;
  payoutFrequency: string;
};
type InvestmentProjectionInput = {
  investedAmount: NumericLike;
  currentValue: NumericLike;
  interestRate?: NumericLike;
  purchaseDate: Date;
  maturityDate?: Date | null;
  monthlyInstallment?: NumericLike;
  installmentDueDay?: number | null;
  sanchayapatraConfig?: ProjectionSanchayapatraConfig | null;
  cashflows?: ProjectionCashflow[];
};

const DEFAULT_INSTALLMENT_DUE_DAY = 5;

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

function toNumber(value: NumericLike) {
  return Number(value || 0);
}

function clampInstallmentDueDay(value?: number | null) {
  if (!Number.isFinite(Number(value))) return DEFAULT_INSTALLMENT_DUE_DAY;
  return Math.min(31, Math.max(1, Math.trunc(Number(value))));
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getInstallmentDueDate(year: number, month: number, dueDay?: number | null) {
  const safeDay = clampInstallmentDueDay(dueDay);
  return new Date(year, month, Math.min(safeDay, getLastDayOfMonth(year, month)));
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getFirstInstallmentDueDate(purchaseDate: Date, dueDay?: number | null) {
  const purchaseDay = startOfLocalDay(purchaseDate);
  let dueDate = getInstallmentDueDate(purchaseDate.getFullYear(), purchaseDate.getMonth(), dueDay);
  if (dueDate < purchaseDay) {
    dueDate = getInstallmentDueDate(purchaseDate.getFullYear(), purchaseDate.getMonth() + 1, dueDay);
  }
  return dueDate;
}

function getNextInstallmentDueDate(dueDate: Date, dueDay?: number | null) {
  return getInstallmentDueDate(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDay);
}

function getInstallmentPaidMonthKeys(cashflows: ProjectionCashflow[]) {
  return new Set(
    cashflows
      .filter((cashflow) => cashflow.type === 'INSTALLMENT' || cashflow.type === 'ADD_FUNDS')
      .map((cashflow) => monthKey(cashflow.installmentDueDate || cashflow.date))
  );
}

function getInstallmentDueDatesThrough(investment: {
  purchaseDate: Date;
  installmentDueDay?: number | null;
}, throughDate: Date) {
  const dates: Date[] = [];
  let dueDate = getFirstInstallmentDueDate(investment.purchaseDate, investment.installmentDueDay);
  const endDate = startOfLocalDay(throughDate);
  let guard = 0;

  while (dueDate <= endDate && guard < 360) {
    dates.push(dueDate);
    dueDate = getNextInstallmentDueDate(dueDate, investment.installmentDueDay);
    guard++;
  }

  return dates;
}

function getInstallmentScheduleDates(investment: InvestmentProjectionInput, paidMonthKeys: Set<string>, today: Date) {
  const dueDates = getInstallmentDueDatesThrough(
    investment,
    addMonthsClamped(today, 6)
  );
  const unpaidDueDates = dueDates.filter((dueDate) => dueDate <= today && !paidMonthKeys.has(monthKey(dueDate)));
  const startDate = unpaidDueDates[0] || getInstallmentDueDate(today.getFullYear(), today.getMonth(), investment.installmentDueDay);
  const visibleDates: Date[] = [];
  let dueDate = startDate;
  let guard = 0;

  while (visibleDates.length < 8 && guard < 24) {
    visibleDates.push(dueDate);
    dueDate = getNextInstallmentDueDate(dueDate, investment.installmentDueDay);
    guard++;
  }

  return visibleDates;
}

function findNextUnpaidInstallmentDueDate(investment: {
  purchaseDate: Date;
  installmentDueDay?: number | null;
}, cashflows: ProjectionCashflow[], now = new Date()) {
  const today = startOfLocalDay(now);
  const paidMonthKeys = getInstallmentPaidMonthKeys(cashflows);
  const dueDates = getInstallmentDueDatesThrough(investment, today);
  return dueDates.find((dueDate) => !paidMonthKeys.has(monthKey(dueDate))) || null;
}

function addMonthsClamped(date: Date, months: number) {
  const targetMonth = date.getMonth() + months;
  const target = new Date(date.getFullYear(), targetMonth, 1);
  const lastDay = getLastDayOfMonth(target.getFullYear(), target.getMonth());
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function addYearsClamped(date: Date, years: number) {
  const target = new Date(date);
  target.setFullYear(date.getFullYear() + years);
  return target;
}

function getFrequencyIntervalMonths(frequency?: string | null) {
  if (frequency === 'MONTHLY') return 1;
  if (frequency === 'QUARTERLY') return 3;
  if (frequency === 'HALF_YEARLY') return 6;
  if (frequency === 'YEARLY') return 12;
  return 0;
}

function yearsBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function buildInvestmentProjection(investment: InvestmentProjectionInput) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const principal = toNumber(investment.investedAmount);
  const projection: {
    dpsInstallments?: Array<{ dueDate: Date; amount: number; status: 'PAID' | 'MISSED' | 'DUE' }>;
    sanchayapatraPayouts?: Array<{ date: Date; amount: number; grossAmount: number; taxAmount: number; label: string }>;
    maturity?: { date: Date; principal: number; projectedReturn: number; projectedValue: number; taxAmount: number };
  } = {};

  const monthlyInstallment = toNumber(investment.monthlyInstallment);
  if (monthlyInstallment > 0) {
    const paidMonthKeys = getInstallmentPaidMonthKeys(investment.cashflows || []);
    const scheduleDates = getInstallmentScheduleDates(investment, paidMonthKeys, today);

    projection.dpsInstallments = scheduleDates.map((dueDate) => {
      const isPaid = paidMonthKeys.has(monthKey(dueDate));
      return {
        dueDate,
        amount: monthlyInstallment,
        status: isPaid ? 'PAID' : dueDate < today ? 'MISSED' : 'DUE',
      };
    });
  }

  if (investment.sanchayapatraConfig && principal > 0) {
    const config = investment.sanchayapatraConfig;
    const maturityDate = investment.maturityDate || addYearsClamped(investment.purchaseDate, 5);
    const termYears = Math.max(1, yearsBetween(investment.purchaseDate, maturityDate));
    const rate = toNumber(config.rate);
    const taxRate = principal > toNumber(config.taxThreshold)
      ? toNumber(config.taxRateAbove)
      : toNumber(config.taxRateBelow);
    const grossYearlyReturn = principal * (rate / 100);
    const totalGrossReturn = grossYearlyReturn * termYears;
    const totalTaxAmount = totalGrossReturn * (taxRate / 100);
    const totalNetReturn = totalGrossReturn - totalTaxAmount;
    const intervalMonths = getFrequencyIntervalMonths(config.payoutFrequency);

    projection.maturity = {
      date: maturityDate,
      principal,
      projectedReturn: totalNetReturn,
      projectedValue: config.payoutFrequency === 'AT_MATURITY' ? principal + totalNetReturn : principal,
      taxAmount: totalTaxAmount,
    };

    if (config.payoutFrequency === 'AT_MATURITY' || intervalMonths === 0) {
      projection.sanchayapatraPayouts = [{
        date: maturityDate,
        amount: totalNetReturn,
        grossAmount: totalGrossReturn,
        taxAmount: totalTaxAmount,
        label: 'Maturity profit',
      }];
    } else {
      const grossPerPayout = grossYearlyReturn / (12 / intervalMonths);
      const taxPerPayout = grossPerPayout * (taxRate / 100);
      const amountPerPayout = grossPerPayout - taxPerPayout;
      const payouts: Array<{ date: Date; amount: number; grossAmount: number; taxAmount: number; label: string }> = [];
      let payoutDate = addMonthsClamped(investment.purchaseDate, intervalMonths);
      let guard = 0;

      while (payoutDate < today && payoutDate < maturityDate && guard < 240) {
        payoutDate = addMonthsClamped(payoutDate, intervalMonths);
        guard++;
      }

      while (payouts.length < 8 && payoutDate <= maturityDate && guard < 260) {
        payouts.push({
          date: payoutDate,
          amount: amountPerPayout,
          grossAmount: grossPerPayout,
          taxAmount: taxPerPayout,
          label: `${config.payoutFrequency.toLowerCase().replace(/_/g, ' ')} profit`,
        });
        payoutDate = addMonthsClamped(payoutDate, intervalMonths);
        guard++;
      }

      projection.sanchayapatraPayouts = payouts;
    }
  }

  return projection;
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
  installmentDueDate?: Date | null;
}) {
  await db.$executeRaw`
    INSERT INTO "InvestmentCashflow" (
      "id", "investmentId", "transactionId", "accountId", "type",
      "amount", "principalAmount", "returnAmount", "taxAmount",
      "date", "installmentDueDate", "description", "createdById"
    )
    VALUES (
      ${data.id}, ${data.investmentId}, ${data.transactionId ?? null}, ${data.accountId ?? null},
      ${data.type}::"InvestmentCashflowType", ${data.amount}, ${data.principalAmount ?? 0},
      ${data.returnAmount ?? 0}, ${data.taxAmount ?? 0}, ${data.date}, ${data.installmentDueDate ?? null},
      ${data.description ?? null}, ${data.createdById ?? null}
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
      sanchayapatraConfig: true,
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
      sanchayapatraConfig: true,
      returns: { orderBy: { date: 'desc' }, take: 20 },
      valuations: { orderBy: { date: 'desc' }, take: 20 },
      cashflows: { orderBy: { date: 'desc' }, take: 80 },
    },
  });
  if (!investment) throw new Error('Investment not found');
  return {
    ...investment,
    projection: buildInvestmentProjection(investment),
  };
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
  installmentDueDay?: number;
  sanchayapatraConfigId?: string;
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

  const sanchayapatraConfigId = typeConfig.slug === 'govt_savings'
    ? data.sanchayapatraConfigId?.trim() || null
    : null;
  if (sanchayapatraConfigId) {
    const config = await prisma.sanchayapatraConfig.findUnique({
      where: { id: sanchayapatraConfigId },
      select: { id: true },
    });
    if (!config) throw new Error('Invalid Sanchayapatra configuration');
  }

  const investmentId = randomUUID();
  const purchaseDate = new Date(data.purchaseDate);
  const maturityDate = data.maturityDate ? new Date(data.maturityDate) : null;
  const monthlyInstallment = data.monthlyInstallment && data.monthlyInstallment > 0
    ? data.monthlyInstallment
    : null;
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
    monthlyInstallment,
    installmentDueDay: monthlyInstallment ? clampInstallmentDueDay(data.installmentDueDay) : null,
    sanchayapatraConfigId,
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
  typeConfigId?: string;
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
  installmentDueDay?: number;
  sanchayapatraConfigId?: string | null;
  quantity?: number;
  avgBuyPrice?: number;
  notes?: string;
  color?: string;
  icon?: string;
  status?: string;
}) {
  const investment = await prisma.investment.findFirst({
    where: { id, userId },
    include: {
      typeConfig: true,
      cashflows: {
        where: { type: { in: ['INSTALLMENT', 'ADD_FUNDS'] } },
        select: { type: true, date: true, installmentDueDate: true, amount: true },
      },
    },
  });
  if (!investment) throw new Error('Investment not found');

  let typeConfig = investment.typeConfig;
  if (data.typeConfigId && data.typeConfigId !== investment.typeConfigId) {
    const nextTypeConfig = await prisma.investmentTypeConfig.findFirst({
      where: {
        id: data.typeConfigId,
        OR: [{ userId }, { isSystem: true, userId: null }],
        isActive: true,
      },
    });
    if (!nextTypeConfig) throw new Error('Invalid investment type');
    typeConfig = nextTypeConfig;
  }

  const nextSanchayapatraConfigId = typeConfig.slug === 'govt_savings'
    ? data.sanchayapatraConfigId?.trim() || null
    : null;
  if (nextSanchayapatraConfigId) {
    const config = await prisma.sanchayapatraConfig.findUnique({
      where: { id: nextSanchayapatraConfigId },
      select: { id: true },
    });
    if (!config) throw new Error('Invalid Sanchayapatra configuration');
  }

  const monthlyInstallment = typeof data.monthlyInstallment === 'number'
    ? data.monthlyInstallment
    : undefined;
  const installmentDueDay = monthlyInstallment !== undefined
    ? monthlyInstallment > 0
      ? clampInstallmentDueDay(data.installmentDueDay)
      : null
    : data.installmentDueDay
      ? clampInstallmentDueDay(data.installmentDueDay)
      : undefined;

  return prisma.investment.update({
    where: { id },
    data: {
      ...data,
      returnFrequency: data.returnFrequency as never,
      status: data.status as never,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : undefined,
      monthlyInstallment,
      installmentDueDay,
      sanchayapatraConfigId: nextSanchayapatraConfigId,
      updatedById: executorId,
    },
    include: { typeConfig: true, sanchayapatraConfig: true },
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
  const investment = await prisma.investment.findFirst({
    where: { id, userId },
    include: {
      typeConfig: true,
      cashflows: {
        where: { type: { in: ['INSTALLMENT', 'ADD_FUNDS'] } },
        select: { type: true, amount: true, date: true, installmentDueDate: true },
      },
    },
  });
  if (!investment) throw new Error('Investment not found');
  if (investment.status !== 'ACTIVE') throw new Error('Only active investments can receive additional funds');

  const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true }, select: { id: true, balance: true } });
  if (!account) throw new Error('Account not found');

  if (Number(account.balance) < amount) throw new Error('Insufficient account balance');

  const flowDate = new Date();
  const isInstallment = investment.typeConfig.hasMonthlyInstallment && Number(investment.monthlyInstallment || 0) > 0;
  const monthlyInstallment = Number(investment.monthlyInstallment || 0);
  if (isInstallment && amount !== monthlyInstallment) {
    throw new Error('Installment amount must match the configured monthly installment');
  }
  const installmentDueDate = isInstallment
    ? findNextUnpaidInstallmentDueDate(investment, investment.cashflows, flowDate)
    : null;
  if (isInstallment && !installmentDueDate) {
    throw new Error('No unpaid DPS installments are due right now');
  }

  const cashflowType: InvestmentCashflowType = isInstallment ? 'INSTALLMENT' : 'ADD_FUNDS';
  const cleanDescription = description?.trim()
    || (isInstallment && installmentDueDate
      ? `DPS installment for ${investment.name} (${installmentDueDate.toLocaleString('default', { month: 'short', year: 'numeric' })})`
      : `Deposit to ${investment.name}`);
  const categoryId = await getInvestmentTransferCategoryId(userId, executorId, 'EXPENSE');
  const transactionId = randomUUID();
  const cashflowId = randomUUID();
  const dueMonthStart = installmentDueDate
    ? new Date(installmentDueDate.getFullYear(), installmentDueDate.getMonth(), 1)
    : null;
  const dueMonthEnd = installmentDueDate
    ? new Date(installmentDueDate.getFullYear(), installmentDueDate.getMonth() + 1, 0, 23, 59, 59, 999)
    : null;
  const paidKeysAfterPayment = isInstallment && installmentDueDate
    ? new Set([...getInstallmentPaidMonthKeys(investment.cashflows), monthKey(installmentDueDate)])
    : null;
  const remainingMissedDueDates = paidKeysAfterPayment
    ? getInstallmentDueDatesThrough(investment, startOfLocalDay(flowDate))
      .filter((dueDate) => dueDate < startOfLocalDay(flowDate) && !paidKeysAfterPayment.has(monthKey(dueDate)))
    : [];

  return prisma.$transaction(async (tx) => {
    if (isInstallment && installmentDueDate && dueMonthStart && dueMonthEnd) {
      const existingPayment = await tx.investmentCashflow.findFirst({
        where: {
          investmentId: id,
          type: { in: ['INSTALLMENT', 'ADD_FUNDS'] },
          OR: [
            { installmentDueDate: { gte: dueMonthStart, lte: dueMonthEnd } },
            { installmentDueDate: null, date: { gte: dueMonthStart, lte: dueMonthEnd } },
          ],
        },
        select: { id: true },
      });
      if (existingPayment) throw new Error('This DPS installment is already paid');
    }

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
        lastInstallmentPaidOn: isInstallment ? flowDate : undefined,
        missedInstallmentCount: isInstallment ? remainingMissedDueDates.length : undefined,
        lastMissedInstallmentOn: isInstallment ? remainingMissedDueDates[0] || null : undefined,
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
      installmentDueDate,
      description: cleanDescription,
      createdById: executorId,
    });

    return updatedInvestment;
  });
}

export async function payDpsInstallment(userId: string, executorId: string, id: string, accountId?: string) {
  const investment = await prisma.investment.findFirst({
    where: { id, userId },
    include: { typeConfig: true },
  });
  if (!investment) throw new Error('Investment not found');
  if (!investment.typeConfig.hasMonthlyInstallment || Number(investment.monthlyInstallment || 0) <= 0) {
    throw new Error('This investment does not have a monthly DPS installment');
  }

  const paymentAccountId = accountId?.trim() || investment.linkedAccountId;
  if (!paymentAccountId) throw new Error('Link an account before paying the DPS installment');

  return addFunds(
    userId,
    executorId,
    id,
    paymentAccountId,
    Number(investment.monthlyInstallment),
    `DPS installment for ${investment.name}`
  );
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
