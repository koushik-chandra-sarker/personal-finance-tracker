
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await (prisma as any).investment.count();
    console.log('Investment count:', count);
    const cashflowCount = await (prisma as any).investmentCashflow.count();
    console.log('InvestmentCashflow count:', cashflowCount);
  } catch (error: any) {
    console.log('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
