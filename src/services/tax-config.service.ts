import { prisma } from '@/lib/prisma';
import { TaxCategory } from '@prisma/client';

type TaxConfigSourceInput = {
  fiscalYear: string;
  category: TaxCategory;
  slabIndex: number;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  label: string;
  source?: string;
};

export async function getTaxConfigs(fiscalYear?: string) {
  const where = fiscalYear ? { fiscalYear } : {};
  return prisma.taxConfig.findMany({
    where,
    orderBy: [
      { fiscalYear: 'desc' },
      { category: 'asc' },
      { slabIndex: 'asc' },
    ],
  });
}

export async function getTaxConfigFiscalYears() {
  const rows = await prisma.taxConfig.findMany({
    where: { isActive: true },
    distinct: ['fiscalYear'],
    select: { fiscalYear: true },
    orderBy: { fiscalYear: 'desc' },
  });

  return rows.map((row) => row.fiscalYear);
}

export async function createTaxConfig(data: {
  fiscalYear: string;
  category: TaxCategory;
  slabIndex: number;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  label: string;
  source?: string;
}) {
  return prisma.taxConfig.create({
    data,
  });
}

export async function updateTaxConfig(id: string, data: Partial<{
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  label: string;
  isActive: boolean;
}>) {
  return prisma.taxConfig.update({
    where: { id },
    data,
  });
}

export async function deleteTaxConfig(id: string) {
  return prisma.taxConfig.delete({
    where: { id },
  });
}

export async function syncTaxConfigsFromSource(fiscalYear: string, configs: TaxConfigSourceInput[]) {
  // We perform this inside a transaction to ensure clean replacement
  return prisma.$transaction(async (tx) => {
    // Optionally delete or mark inactive old configs for this FY
    await tx.taxConfig.deleteMany({
      where: { fiscalYear },
    });

    // Insert new configs
    await tx.taxConfig.createMany({
      data: configs,
    });
  });
}
