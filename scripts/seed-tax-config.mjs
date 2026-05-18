import { PrismaClient, TaxCategory } from '@prisma/client';

const prisma = new PrismaClient();

const FISCAL_YEARS = ['2025-26', '2026-27'];

const taxConfigs = [
  {
    category: TaxCategory.MALE,
    slabs: [
      { minAmount: 0, maxAmount: 375000, rate: 0, label: 'Up to ৳3,75,000' },
      { minAmount: 375000, maxAmount: 675000, rate: 10, label: '৳3,75,001 - ৳6,75,000' },
      { minAmount: 675000, maxAmount: 1075000, rate: 15, label: '৳6,75,001 - ৳10,75,000' },
      { minAmount: 1075000, maxAmount: 1575000, rate: 20, label: '৳10,75,001 - ৳15,75,000' },
      { minAmount: 1575000, maxAmount: 3575000, rate: 25, label: '৳15,75,001 - ৳35,75,000' },
      { minAmount: 3575000, maxAmount: null, rate: 30, label: 'Above ৳35,75,000' },
    ],
  },
  {
    category: TaxCategory.FEMALE,
    slabs: [
      { minAmount: 0, maxAmount: 425000, rate: 0, label: 'Up to ৳4,25,000' },
      { minAmount: 425000, maxAmount: 725000, rate: 10, label: '৳4,25,001 - ৳7,25,000' },
      { minAmount: 725000, maxAmount: 1125000, rate: 15, label: '৳7,25,001 - ৳11,25,000' },
      { minAmount: 1125000, maxAmount: 1625000, rate: 20, label: '৳11,25,001 - ৳16,25,000' },
      { minAmount: 1625000, maxAmount: 3625000, rate: 25, label: '৳16,25,001 - ৳36,25,000' },
      { minAmount: 3625000, maxAmount: null, rate: 30, label: 'Above ৳36,25,000' },
    ],
  },
];

async function main() {
  let upserted = 0;

  for (const fiscalYear of FISCAL_YEARS) {
    for (const group of taxConfigs) {
      for (const [index, slab] of group.slabs.entries()) {
        await prisma.taxConfig.upsert({
          where: {
            fiscalYear_category_slabIndex: {
              fiscalYear,
              category: group.category,
              slabIndex: index,
            },
          },
          update: {
            minAmount: slab.minAmount,
            maxAmount: slab.maxAmount,
            rate: slab.rate,
            label: slab.label,
            isActive: true,
            source: 'nbr-budget-2025-26',
          },
          create: {
            fiscalYear,
            category: group.category,
            slabIndex: index,
            minAmount: slab.minAmount,
            maxAmount: slab.maxAmount,
            rate: slab.rate,
            label: slab.label,
            isActive: true,
            source: 'nbr-budget-2025-26',
          },
        });

        upserted += 1;
      }
    }
  }

  console.log(`Seeded ${upserted} tax config slabs for FY ${FISCAL_YEARS.join(', ')}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
