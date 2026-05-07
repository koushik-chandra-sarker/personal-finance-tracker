import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllTypeConfigs } from '@/services/investment-type.service';
import TypeConfigListClient from '@/components/investments/TypeConfigListClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function InvestmentTypesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');

  const typeConfigs = await getAllTypeConfigs(userId);

  return <TypeConfigListClient typeConfigs={JSON.parse(JSON.stringify(typeConfigs))} />;
}
