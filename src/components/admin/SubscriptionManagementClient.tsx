'use client';

import { useMemo, useState, useTransition } from 'react';
import { CreditCard, Infinity, Timer, UserX } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import {
  getAdminUsersAction,
  grantUserAccessAction,
  revokeUserAccessAction,
  type AdminUserRow,
} from '@/actions/admin.actions';

interface SubscriptionManagementClientProps {
  initialUsers: AdminUserRow[];
}

function formatAccessUntil(date: string | null) {
  return date ? new Date(date).toLocaleDateString() : 'Unlimited';
}

export default function SubscriptionManagementClient({ initialUsers }: SubscriptionManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const active = users.filter((user) => user.subscription);
    return {
      active: active.length,
      adminGranted: active.filter((user) => user.subscription?.source === 'ADMIN_GRANT').length,
      unlimited: active.filter((user) => !user.subscription?.currentPeriodEnd).length,
      missing: users.filter((user) => user.role !== 'ADMIN' && !user.subscription).length,
    };
  }, [users]);

  const refreshList = async () => {
    const nextUsers = await getAdminUsersAction();
    setUsers(nextUsers);
  };

  const grantAccess = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await grantUserAccessAction(formData);
      if (result.success) await refreshList();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const revokeAccess = (userId: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await revokeUserAccessAction(userId);
      if (result.success) await refreshList();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Grant, review, and revoke full access for users.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CreditCard className="mb-3 h-5 w-5 text-indigo-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Active Access</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p></Card>
        <Card><Timer className="mb-3 h-5 w-5 text-emerald-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Admin Grants</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.adminGranted}</p></Card>
        <Card><Infinity className="mb-3 h-5 w-5 text-sky-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Unlimited</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.unlimited}</p></Card>
        <Card><UserX className="mb-3 h-5 w-5 text-rose-500" /><p className="text-sm text-slate-500 dark:text-slate-400">No Access</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.missing}</p></Card>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Grant Full Access</h2>
        <form action={grantAccess} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <Input id="grantEmail" name="email" type="email" label="User Email" placeholder="user@example.com" required />
          <div>
            <label htmlFor="grantDuration" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Duration</label>
            <select
              id="grantDuration"
              name="duration"
              defaultValue="MONTHLY"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
            >
              <option value="MONTHLY">1 Month</option>
              <option value="YEARLY">1 Year</option>
              <option value="UNLIMITED">Unlimited</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending} className="w-full">Grant</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Subscriptions</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {users.map((user) => (
            <div key={user.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_180px_180px_120px] lg:items-center">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Source</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.role === 'ADMIN' ? 'Admin' : user.subscription?.source?.toLowerCase().replace('_', ' ') || 'No access'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Valid Until</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.role === 'ADMIN' ? 'Unlimited' : user.subscription ? formatAccessUntil(user.subscription.currentPeriodEnd) : '-'}</p>
              </div>
              <div className="lg:text-right">
                {user.role !== 'ADMIN' && user.subscription && (
                  <Button variant="outline" size="sm" onClick={() => revokeAccess(user.id)} disabled={isPending}>
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
