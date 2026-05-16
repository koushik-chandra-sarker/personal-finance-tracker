import { fetchTaxConfigsAction } from '@/actions/tax-config.actions';
import TaxConfigClient, { type TaxConfigClientRow } from '@/components/admin/TaxConfigClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminTaxConfigPage() {
  await requireRole('ADMIN');
  
  const configs = await fetchTaxConfigsAction();
  const rows: TaxConfigClientRow[] = configs.map((config) => ({
    id: config.id,
    fiscalYear: config.fiscalYear,
    category: config.category,
    slabIndex: config.slabIndex,
    minAmount: config.minAmount.toString(),
    maxAmount: config.maxAmount?.toString() ?? null,
    rate: config.rate.toString(),
    label: config.label,
    isActive: config.isActive,
    source: config.source,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  }));

  return <TaxConfigClient initialConfigs={rows} />;
}
