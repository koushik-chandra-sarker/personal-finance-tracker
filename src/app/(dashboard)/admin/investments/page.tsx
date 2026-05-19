import { getSanchayapatraConfigs } from '@/services/sanchayapatra-config.service';
import SanchayapatraAdminClient from '@/components/admin/SanchayapatraAdminClient';
import { validateAccess } from '@/lib/access';
import { getMessages } from '@/i18n/messages';
import { getRequestLocale } from '@/i18n/server';

export default async function SanchayapatraAdminPage() {
  await validateAccess('SETTINGS', 'EDIT');
  const configs = await getSanchayapatraConfigs();
  const locale = await getRequestLocale();
  const copy = getMessages(locale).pages.admin.investmentConfig;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
        <p className="text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
      </div>

      <SanchayapatraAdminClient initialConfigs={JSON.parse(JSON.stringify(configs))} />
    </div>
  );
}
