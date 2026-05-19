import { redirect } from 'next/navigation';
import TaxCalculatorClient from '@/components/tax-calculator/TaxCalculatorClient';
import { auth } from '@/lib/auth';
import { getBangladeshFiscalYear } from '@/lib/salary-calculator';
import { validateAccess } from '@/lib/access';
import { getTaxConfigs } from '@/services/tax-config.service';

export default async function TaxCalculatorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  await validateAccess('SALARY_PLANNER', 'VIEW');

  const configs = await getTaxConfigs();

  const currency = session.user.currency || 'BDT';
  const activeFiscalYear = getBangladeshFiscalYear();
  const fiscalYears = Array.from(new Set([activeFiscalYear, ...configs.map((config) => config.fiscalYear)])).sort((a, b) => b.localeCompare(a));
  const taxConfigsByYear = fiscalYears.reduce<Record<string, {
    male: Array<{ min: number; max: number | null; rate: number; label: string }>;
    female: Array<{ min: number; max: number | null; rate: number; label: string }>;
  }>>((acc, fiscalYear) => {
    const yearConfigs = configs.filter((config) => config.fiscalYear === fiscalYear && config.isActive);
    acc[fiscalYear] = {
      male: yearConfigs.filter((config) => config.category === 'MALE').map((config) => ({
        min: Number(config.minAmount),
        max: config.maxAmount ? Number(config.maxAmount) : null,
        rate: Number(config.rate),
        label: config.label,
      })),
      female: yearConfigs.filter((config) => config.category === 'FEMALE').map((config) => ({
        min: Number(config.minAmount),
        max: config.maxAmount ? Number(config.maxAmount) : null,
        rate: Number(config.rate),
        label: config.label,
      })),
    };
    return acc;
  }, {});

  return (
    <TaxCalculatorClient
      currency={currency}
      initialFiscalYear={activeFiscalYear}
      fiscalYears={fiscalYears}
      taxConfigsByYear={taxConfigsByYear}
    />
  );
}
