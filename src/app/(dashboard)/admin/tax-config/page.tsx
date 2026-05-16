import { fetchTaxConfigsAction } from '@/actions/tax-config.actions';
import TaxConfigClient from '@/components/admin/TaxConfigClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminTaxConfigPage() {
  await requireRole('ADMIN');
  
  const configs = await fetchTaxConfigsAction();

  return <TaxConfigClient initialConfigs={configs} />;
}
