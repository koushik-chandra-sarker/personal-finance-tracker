import { prisma } from '@/lib/prisma';

const SYSTEM_DEFAULTS = [
  {
    slug: 'govt_savings',
    name: 'Sanchayapatra',
    description: 'National Savings Certificates (Poribar, Pensioner, 3-Monthly, 5-Year)',
    icon: 'landmark',
    color: '#059669',
    hasInterestRate: true,
    hasReturnFrequency: true,
    hasMaturityDate: true,
    hasMonthlyInstallment: false,
    hasQuantity: false,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['INTEREST'],
    sortOrder: 1,
  },
  {
    slug: 'fixed_deposit',
    name: 'Fixed Deposit (FDR)',
    description: 'Bank fixed-term deposit with guaranteed interest',
    icon: 'banknote',
    color: '#2563eb',
    hasInterestRate: true,
    hasReturnFrequency: true,
    hasMaturityDate: true,
    hasMonthlyInstallment: false,
    hasQuantity: false,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['INTEREST'],
    sortOrder: 2,
  },
  {
    slug: 'dps',
    name: 'DPS',
    description: 'Deposit Pension Scheme — monthly installments with lump sum at maturity',
    icon: 'piggy-bank',
    color: '#7c3aed',
    hasInterestRate: true,
    hasReturnFrequency: false,
    hasMaturityDate: true,
    hasMonthlyInstallment: true,
    hasQuantity: false,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['INTEREST'],
    sortOrder: 3,
  },
  {
    slug: 'stock',
    name: 'Stock Market',
    description: 'DSE/CSE equities — capital gains and dividends',
    icon: 'trending-up',
    color: '#dc2626',
    hasInterestRate: false,
    hasReturnFrequency: false,
    hasMaturityDate: false,
    hasMonthlyInstallment: false,
    hasQuantity: true,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['DIVIDEND', 'CAPITAL_GAIN'],
    sortOrder: 4,
  },
  {
    slug: 'mutual_fund',
    name: 'Mutual Fund',
    description: 'Open-end and closed-end mutual funds',
    icon: 'bar-chart-3',
    color: '#ea580c',
    hasInterestRate: false,
    hasReturnFrequency: false,
    hasMaturityDate: false,
    hasMonthlyInstallment: false,
    hasQuantity: true,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['DIVIDEND', 'CAPITAL_GAIN'],
    sortOrder: 5,
  },
  {
    slug: 'bond',
    name: 'Bond',
    description: 'Government or corporate bonds with coupon payments',
    icon: 'file-text',
    color: '#0891b2',
    hasInterestRate: true,
    hasReturnFrequency: true,
    hasMaturityDate: true,
    hasMonthlyInstallment: false,
    hasQuantity: false,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['COUPON'],
    sortOrder: 6,
  },
  {
    slug: 'gold',
    name: 'Gold / Precious Metals',
    description: 'Physical or digital gold investments',
    icon: 'coins',
    color: '#ca8a04',
    hasInterestRate: false,
    hasReturnFrequency: false,
    hasMaturityDate: false,
    hasMonthlyInstallment: false,
    hasQuantity: true,
    hasInstitution: false,
    hasAccountNumber: false,
    returnTypes: ['CAPITAL_GAIN'],
    sortOrder: 7,
  },
  {
    slug: 'real_estate',
    name: 'Real Estate',
    description: 'Property, land, and flat investments',
    icon: 'building-2',
    color: '#65a30d',
    hasInterestRate: false,
    hasReturnFrequency: false,
    hasMaturityDate: false,
    hasMonthlyInstallment: false,
    hasQuantity: false,
    hasInstitution: false,
    hasAccountNumber: false,
    returnTypes: ['RENTAL', 'CAPITAL_GAIN'],
    sortOrder: 8,
  },
  {
    slug: 'insurance',
    name: 'Life Insurance',
    description: 'Endowment, ULIP, and term insurance with maturity benefits',
    icon: 'shield',
    color: '#be185d',
    hasInterestRate: true,
    hasReturnFrequency: false,
    hasMaturityDate: true,
    hasMonthlyInstallment: true,
    hasQuantity: false,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['MATURITY_BENEFIT'],
    sortOrder: 9,
  },
  {
    slug: 'treasury',
    name: 'Treasury Bill/Bond',
    description: 'Bangladesh Bank treasury bills and bonds',
    icon: 'scroll',
    color: '#4f46e5',
    hasInterestRate: true,
    hasReturnFrequency: true,
    hasMaturityDate: true,
    hasMonthlyInstallment: false,
    hasQuantity: false,
    hasInstitution: true,
    hasAccountNumber: true,
    returnTypes: ['COUPON'],
    sortOrder: 10,
  },
];

export async function ensureSystemDefaults() {
  const existing = await prisma.investmentTypeConfig.findMany({
    where: { isSystem: true, userId: null },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((e) => e.slug));

  const toCreate = SYSTEM_DEFAULTS.filter((d) => !existingSlugs.has(d.slug));
  if (toCreate.length === 0) return;

  await prisma.investmentTypeConfig.createMany({
    data: toCreate.map((d) => ({ ...d, isSystem: true, userId: null })),
  });
}

export async function getTypeConfigs(userId: string) {
  // Ensure system defaults exist
  await ensureSystemDefaults();

  return prisma.investmentTypeConfig.findMany({
    where: {
      OR: [
        { isSystem: true, userId: null },
        { userId },
      ],
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getAllTypeConfigs(userId: string) {
  await ensureSystemDefaults();

  return prisma.investmentTypeConfig.findMany({
    where: {
      OR: [
        { isSystem: true, userId: null },
        { userId },
      ],
    },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { investments: true } } },
  });
}

export async function createTypeConfig(userId: string, data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  hasInterestRate?: boolean;
  hasReturnFrequency?: boolean;
  hasMaturityDate?: boolean;
  hasMonthlyInstallment?: boolean;
  hasQuantity?: boolean;
  hasInstitution?: boolean;
  hasAccountNumber?: boolean;
  returnTypes?: string[];
}) {
  const maxSort = await prisma.investmentTypeConfig.aggregate({
    _max: { sortOrder: true },
  });

  return prisma.investmentTypeConfig.create({
    data: {
      userId,
      slug: data.slug,
      name: data.name,
      description: data.description,
      icon: data.icon || 'trending-up',
      color: data.color || '#6366f1',
      isSystem: false,
      hasInterestRate: data.hasInterestRate ?? false,
      hasReturnFrequency: data.hasReturnFrequency ?? false,
      hasMaturityDate: data.hasMaturityDate ?? true,
      hasMonthlyInstallment: data.hasMonthlyInstallment ?? false,
      hasQuantity: data.hasQuantity ?? false,
      hasInstitution: data.hasInstitution ?? true,
      hasAccountNumber: data.hasAccountNumber ?? true,
      returnTypes: data.returnTypes || [],
      sortOrder: (maxSort._max.sortOrder || 0) + 1,
    },
  });
}

export async function updateTypeConfig(userId: string, id: string, data: {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  hasInterestRate?: boolean;
  hasReturnFrequency?: boolean;
  hasMaturityDate?: boolean;
  hasMonthlyInstallment?: boolean;
  hasQuantity?: boolean;
  hasInstitution?: boolean;
  hasAccountNumber?: boolean;
  returnTypes?: string[];
}) {
  const config = await prisma.investmentTypeConfig.findFirst({
    where: { id, OR: [{ userId }, { isSystem: true, userId: null }] },
  });
  if (!config) throw new Error('Type config not found');

  // System types: only allow toggling isActive
  if (config.isSystem) {
    return prisma.investmentTypeConfig.update({
      where: { id },
      data: { isActive: data.isActive },
    });
  }

  return prisma.investmentTypeConfig.update({
    where: { id },
    data,
  });
}

export async function deleteTypeConfig(userId: string, id: string) {
  const config = await prisma.investmentTypeConfig.findFirst({
    where: { id, userId, isSystem: false },
    include: { _count: { select: { investments: true } } },
  });
  if (!config) throw new Error('Type config not found or is a system type');
  if (config._count.investments > 0) throw new Error('Cannot delete type with existing investments');

  await prisma.investmentTypeConfig.delete({ where: { id } });
  return true;
}
