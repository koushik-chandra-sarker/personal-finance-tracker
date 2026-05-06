import { prisma } from '@/lib/prisma';

export async function getSanchayapatraConfigs() {
  const configs = await prisma.sanchayapatraConfig.findMany({
    orderBy: { type: 'asc' }
  });

  if (configs.length === 0) {
    // Seed default values if empty
    const defaults = [
      { 
        type: 'poribar', 
        name: 'Poribar Sanchayapatra', 
        description: 'Monthly profit, specifically for women and senior citizens.',
        rate: 11.52, 
        payoutFrequency: 'MONTHLY' 
      },
      { 
        type: 'pensioner', 
        name: 'Pensioner Sanchayapatra', 
        description: '3-monthly profit for retired government employees.',
        rate: 11.76, 
        payoutFrequency: 'QUARTERLY' 
      },
      { 
        type: '3monthly', 
        name: '3-Monthly Profit Sanchayapatra', 
        description: 'Profit paid every three months to any citizen.',
        rate: 11.04, 
        payoutFrequency: 'QUARTERLY' 
      },
      { 
        type: '5year', 
        name: '5-Year Bangladesh Sanchayapatra', 
        description: 'Profit paid at maturity after 5 years.',
        rate: 11.28, 
        payoutFrequency: 'AT_MATURITY' 
      },
    ];

    await prisma.sanchayapatraConfig.createMany({
      data: defaults.map(d => ({
        ...d,
        taxThreshold: 500000,
        taxRateBelow: 5,
        taxRateAbove: 10,
      }))
    });

    return prisma.sanchayapatraConfig.findMany({ orderBy: { type: 'asc' } });
  }

  return configs;
}

export async function createSanchayapatraConfig(data: {
  type: string;
  name: string;
  description?: string;
  rate: number;
  taxThreshold: number;
  taxRateBelow: number;
  taxRateAbove: number;
  payoutFrequency: string;
}) {
  return prisma.sanchayapatraConfig.create({
    data
  });
}

export async function updateSanchayapatraConfig(id: string, data: {
  type: string;
  name: string;
  description?: string;
  rate: number;
  taxThreshold: number;
  taxRateBelow: number;
  taxRateAbove: number;
  payoutFrequency: string;
}) {
  return prisma.sanchayapatraConfig.update({
    where: { id },
    data
  });
}

export async function deleteSanchayapatraConfig(id: string) {
  return prisma.sanchayapatraConfig.delete({
    where: { id }
  });
}

