import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getInvestments, getPortfolioSummary, getPortfolioAllocation, getUpcomingMaturities, getPortfolioGrowth } from '@/services/investment.service';
import { getTypeConfigs } from '@/services/investment-type.service';
import { getAccounts } from '@/services/account.service';
import { getSanchayapatraConfigs } from '@/services/sanchayapatra-config.service';
import InvestmentPageClient from '@/components/investments/InvestmentPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function InvestmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');

  const [investments, typeConfigs, accounts, summary, allocation, maturities, growthData, sanchayapatraConfigs] = await Promise.all([
    getInvestments(userId),
    getTypeConfigs(userId),
    getAccounts(userId),
    getPortfolioSummary(userId),
    getPortfolioAllocation(userId),
    getUpcomingMaturities(userId),
    getPortfolioGrowth(userId),
    getSanchayapatraConfigs(),
  ]);

  return (
    <InvestmentPageClient
      investments={JSON.parse(JSON.stringify(investments))}
      typeConfigs={JSON.parse(JSON.stringify(typeConfigs))}
      accounts={JSON.parse(JSON.stringify(accounts))}
      summary={JSON.parse(JSON.stringify(summary))}
      allocation={JSON.parse(JSON.stringify(allocation))}
      maturities={JSON.parse(JSON.stringify(maturities))}
      growthData={JSON.parse(JSON.stringify(growthData))}
      sanchayapatraConfigs={JSON.parse(JSON.stringify(sanchayapatraConfigs))}
      currency={session.user.currency || 'BDT'}
    />
  );
}
