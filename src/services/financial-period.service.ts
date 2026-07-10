import { prisma } from '@/lib/prisma';
import { normalizeFinancialMonthStartDay } from '@/lib/financial-period';

export async function getFinancialMonthStartDay(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { financialMonthStartDay: true },
  });
  return normalizeFinancialMonthStartDay(user?.financialMonthStartDay);
}
