import { getAdminMessagesAction, getAdminMessageUsersAction } from '@/actions/admin-message.actions';
import AdminMessagesClient from '@/components/admin/AdminMessagesClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminMessagesPage() {
  await requireRole('ADMIN');
  const [messages, users] = await Promise.all([
    getAdminMessagesAction(),
    getAdminMessageUsersAction(),
  ]);

  return <AdminMessagesClient initialMessages={messages} users={users} />;
}
