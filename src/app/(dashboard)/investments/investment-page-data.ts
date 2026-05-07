import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import {
  getInvestments,
  getPortfolioAllocation,
  getPortfolioGrowth,
  getPortfolioSummary,
  getUpcomingMaturities,
} from '@/services/investment.service';
import { getTypeConfigs } from '@/services/investment-type.service';
import { getAccounts } from '@/services/account.service';
import { getSanchayapatraConfigs } from '@/services/sanchayapatra-config.service';

function serialize(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function getInvestmentPageData() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');

  const [
    investments,
    typeConfigs,
    accounts,
    summary,
    allocation,
    maturities,
    growthData,
    sanchayapatraConfigs,
  ] = await Promise.all([
    getInvestments(userId),
    getTypeConfigs(userId),
    getAccounts(userId),
    getPortfolioSummary(userId),
    getPortfolioAllocation(userId),
    getUpcomingMaturities(userId),
    getPortfolioGrowth(userId),
    getSanchayapatraConfigs(),
  ]);

  return {
    investments: serialize(investments),
    typeConfigs: serialize(typeConfigs),
    accounts: serialize(accounts),
    summary: serialize(summary),
    allocation: serialize(allocation),
    maturities: serialize(maturities),
    growthData: serialize(growthData),
    sanchayapatraConfigs: serialize(sanchayapatraConfigs),
    currency: session.user.currency || 'BDT',
  };
}
