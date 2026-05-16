import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SalaryPlannerClient from '@/components/salary-planner/SalaryPlannerClient';
import { getTaxConfigs } from '@/services/tax-config.service';

export default async function SalaryPlannerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const currency = session.user.currency || 'BDT';
  const configs = await getTaxConfigs('2025-26');
  
  const maleSlabs = configs.filter(c => c.category === 'MALE' && c.isActive).map(c => ({
    min: Number(c.minAmount),
    max: c.maxAmount ? Number(c.maxAmount) : null,
    rate: Number(c.rate),
    label: c.label,
  }));

  const femaleSlabs = configs.filter(c => c.category === 'FEMALE' && c.isActive).map(c => ({
    min: Number(c.minAmount),
    max: c.maxAmount ? Number(c.maxAmount) : null,
    rate: Number(c.rate),
    label: c.label,
  }));

  return <SalaryPlannerClient 
    currency={currency} 
    customMaleSlabs={maleSlabs.length > 0 ? maleSlabs : undefined}
    customFemaleSlabs={femaleSlabs.length > 0 ? femaleSlabs : undefined}
  />;
}
