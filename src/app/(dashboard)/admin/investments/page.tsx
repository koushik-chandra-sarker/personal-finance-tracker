import { getSanchayapatraConfigs } from '@/services/sanchayapatra-config.service';
import SanchayapatraAdminClient from '@/components/admin/SanchayapatraAdminClient';
import { validateAccess } from '@/lib/access';

export default async function SanchayapatraAdminPage() {
  await validateAccess('SETTINGS', 'EDIT');
  const configs = await getSanchayapatraConfigs();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Investment Configuration</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage global profit rates and tax rules for Sanchayapatra.</p>
      </div>

      <SanchayapatraAdminClient initialConfigs={JSON.parse(JSON.stringify(configs))} />
    </div>
  );
}
