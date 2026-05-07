'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import {
  createUserInviteAction,
  type AdminInviteResult,
  type AdminSubscriptionPackageRow,
} from '@/actions/admin.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';

type UserInvitePanelProps = {
  packages: AdminSubscriptionPackageRow[];
};

const inviteRoleOptions = [
  { value: 'USER', label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
];

const inviteExpiryOptions = [
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function UserInvitePanel({ packages }: UserInvitePanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastInvite, setLastInvite] = useState<AdminInviteResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const invitePackageOptions = [
    { value: '', label: 'No package' },
    ...packages.filter((pkg) => pkg.isActive).map((pkg) => ({ value: pkg.id, label: pkg.name })),
  ];

  const openInviteModal = () => {
    setMessage(null);
    setLastInvite(null);
    setIsOpen(true);
  };

  const createInvite = (formData: FormData) => {
    setMessage(null);
    setLastInvite(null);
    startTransition(async () => {
      const result = await createUserInviteAction(formData);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success && result.data) {
        setLastInvite({
          ...result.data,
          inviteUrl: `${window.location.origin}${result.data.inviteUrl}`,
        });
      }
      router.refresh();
    });
  };

  const copyInviteLink = async () => {
    if (!lastInvite) return;
    await navigator.clipboard.writeText(lastInvite.inviteUrl);
    setMessage({ type: 'success', text: 'Invite link copied' });
  };

  return (
    <>
      <Button type="button" className="w-full sm:w-auto" onClick={openInviteModal}>
        <UserPlus className="h-4 w-4" />
        Invite User
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Invite User" className="max-w-2xl">
        <Loader show={isPending} message="Creating invite..." />

        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Create a one-time registration link with an assigned role and optional package.
        </p>

        {message && (
          <div className={`mb-4 rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {message.text}
          </div>
        )}

        <form action={createInvite} className="grid gap-4 sm:grid-cols-2">
          <Input id="inviteEmail" name="email" label="Email" type="email" placeholder="user@example.com" required />
          <Select id="inviteRole" name="role" label="Role" defaultValue="USER" options={inviteRoleOptions} />
          <Select id="invitePackageId" name="packageId" label="Package" defaultValue="" options={invitePackageOptions} />
          <Select id="inviteExpiresInDays" name="expiresInDays" label="Expires" defaultValue="7" options={inviteExpiryOptions} />
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-[42px] w-full sm:w-28" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button type="submit" className="h-[42px] w-full sm:w-36" isLoading={isPending}>
              Create Invite
            </Button>
          </div>
        </form>

        {lastInvite && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">Invite Link</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={lastInvite.inviteUrl}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600/50 dark:bg-slate-800 dark:text-slate-200"
              />
              <Button type="button" variant="outline" className="h-[42px] w-full sm:w-28" onClick={copyInviteLink}>
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Expires {formatDate(lastInvite.expiresAt)}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
