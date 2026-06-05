import { getAdminContactSettingsAction } from '@/actions/app-config.actions';
import AdminContactSettingsClient from '@/components/admin/AdminContactSettingsClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminContactSettingsPage() {
  await requireRole('ADMIN');
  const settings = await getAdminContactSettingsAction();

  return <AdminContactSettingsClient initialSettings={settings} />;
}
