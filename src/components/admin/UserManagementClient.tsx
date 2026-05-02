'use client';

import { useMemo, useState, useTransition } from 'react';
import { Shield, UserCog, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { updateUserRoleAction, type AdminUserRow } from '@/actions/admin.actions';
import type { UserRole } from '@prisma/client';

interface UserManagementClientProps {
  initialUsers: AdminUserRow[];
}

export default function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      subscribed: users.filter((user) => user.subscription).length,
    };
  }, [users]);

  const updateRole = (userId: string, role: UserRole) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, role);
      if (result.success) {
        setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
      }
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage account roles and review user access status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <Users className="mb-3 h-5 w-5 text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </Card>
        <Card>
          <Shield className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Admins</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.admins}</p>
        </Card>
        <Card>
          <UserCog className="mb-3 h-5 w-5 text-sky-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">With Access</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.subscribed}</p>
        </Card>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Users</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {users.map((user) => (
            <div key={user.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_180px_180px] lg:items-center">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Access</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {user.role === 'ADMIN' ? 'Admin' : user.subscription ? 'Subscribed' : 'No access'}
                </p>
              </div>
              <div className="flex gap-2 lg:justify-end">
                <Button
                  size="sm"
                  variant={user.role === 'USER' ? 'secondary' : 'outline'}
                  disabled={isPending || user.role === 'USER'}
                  onClick={() => updateRole(user.id, 'USER')}
                >
                  User
                </Button>
                <Button
                  size="sm"
                  variant={user.role === 'ADMIN' ? 'secondary' : 'outline'}
                  disabled={isPending || user.role === 'ADMIN'}
                  onClick={() => updateRole(user.id, 'ADMIN')}
                >
                  Admin
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
