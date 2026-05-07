'use client';

import { useState } from 'react';
import { CalendarClock, CheckCircle2, Mail, Timer, UserPlus } from 'lucide-react';
import type { AdminUserInviteRow } from '@/actions/admin.actions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

type UserInviteListProps = {
  invites: AdminUserInviteRow[];
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function formatInviteStatus(status: AdminUserInviteRow['status']) {
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'EXPIRED') return 'Expired';
  return 'Pending';
}

function getInviteBadgeVariant(status: AdminUserInviteRow['status']) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'EXPIRED') return 'danger';
  return 'warning';
}

function InviteMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
      <p className="truncate text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function UserInviteList({ invites }: UserInviteListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingCount = invites.filter((invite) => invite.status === 'PENDING').length;
  const acceptedCount = invites.filter((invite) => invite.status === 'ACCEPTED').length;
  const expiredCount = invites.filter((invite) => invite.status === 'EXPIRED').length;

  return (
    <>
      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsOpen(true)}>
        <Mail className="h-4 w-4" />
        View Invites
        {pendingCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">{pendingCount}</span>}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="User Invites" className="max-w-4xl">
        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <InviteMetric label="Total" value={invites.length} />
          <InviteMetric label="Pending" value={pendingCount} />
          <InviteMetric label="Accepted" value={acceptedCount} />
          <InviteMetric label="Expired" value={expiredCount} />
        </div>

        {invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No invited users yet</p>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Created invites will appear here with role, package, expiry, and acceptance status.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-900/30">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{invite.email}</p>
                      <Badge variant={getInviteBadgeVariant(invite.status)}>{formatInviteStatus(invite.status)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Invited by {invite.invitedBy?.name || invite.invitedBy?.email || 'Unknown admin'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={invite.role === 'ADMIN' ? 'info' : 'default'}>{invite.role === 'ADMIN' ? 'Admin' : 'User'}</Badge>
                    <Badge variant="default">{invite.package?.name || (invite.role === 'ADMIN' ? 'Admin access' : 'No package')}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>Created {formatDate(invite.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:justify-end">
                    {invite.acceptedAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                    <span>{invite.acceptedAt ? `Accepted ${formatDate(invite.acceptedAt)}` : `Expires ${formatDate(invite.expiresAt)}`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
