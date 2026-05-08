import { getAdminAnalyticsAction } from '@/actions/admin.actions';
import AdminAnalyticsClient from '@/components/admin/AdminAnalyticsClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminAnalyticsPage() {
  await requireRole('ADMIN');
  const analytics = await getAdminAnalyticsAction();

  return <AdminAnalyticsClient analytics={analytics} />;
}
