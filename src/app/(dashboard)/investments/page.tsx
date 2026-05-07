import InvestmentPageClient from '@/components/investments/InvestmentPageClient';
import { getInvestmentPageData } from './investment-page-data';

export default async function InvestmentsPage() {
  const data = await getInvestmentPageData();

  return (
    <InvestmentPageClient
      {...data}
      view="dashboard"
    />
  );
}
