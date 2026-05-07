import InvestmentPageClient from '@/components/investments/InvestmentPageClient';
import { getInvestmentPageData } from '../investment-page-data';

export default async function InvestmentPortfolioPage() {
  const data = await getInvestmentPageData();

  return (
    <InvestmentPageClient
      {...data}
      view="portfolio"
    />
  );
}
