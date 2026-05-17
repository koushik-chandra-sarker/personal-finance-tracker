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
import { useI18n } from '@/i18n/client';

type UserInvitePanelProps = {
  packages: AdminSubscriptionPackageRow[];
};

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale);
}

export default function UserInvitePanel({ packages }: UserInvitePanelProps) {
  const { locale, messages } = useI18n();
  const adminCopy = messages.pages.admin;
  const copy = adminCopy.invites;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastInvite, setLastInvite] = useState<AdminInviteResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const invitePackageOptions = [
    { value: '', label: copy.noPackage },
    ...packages.filter((pkg) => pkg.isActive).map((pkg) => ({ value: pkg.id, label: pkg.name })),
  ];
  const inviteRoleOptions = [
    { value: 'USER', label: adminCopy.common.user },
    { value: 'ADMIN', label: adminCopy.common.admin },
  ];
  const inviteExpiryOptions = [
    { value: '3', label: copy.dayOptions.d3 },
    { value: '7', label: copy.dayOptions.d7 },
    { value: '14', label: copy.dayOptions.d14 },
    { value: '30', label: copy.dayOptions.d30 },
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
    setMessage({ type: 'success', text: copy.copied });
  };

  return (
    <>
      <Button type="button" className="w-full sm:w-auto" onClick={openInviteModal}>
        <UserPlus className="h-4 w-4" />
        {copy.inviteUser}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={copy.inviteUser} className="max-w-2xl">
        <Loader show={isPending} message={copy.creating} />

        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          {copy.help}
        </p>

        {message && (
          <div className={`mb-4 rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {message.text}
          </div>
        )}

        <form action={createInvite} className="grid gap-4 sm:grid-cols-2">
          <Input id="inviteEmail" name="email" label={adminCopy.createUser.email} type="email" placeholder="user@example.com" required />
          <Select id="inviteRole" name="role" label={adminCopy.common.role} defaultValue="USER" options={inviteRoleOptions} />
          <Select id="invitePackageId" name="packageId" label={adminCopy.common.package} defaultValue="" options={invitePackageOptions} />
          <Select id="inviteExpiresInDays" name="expiresInDays" label={copy.expires} defaultValue="7" options={inviteExpiryOptions} />
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-[42px] w-full sm:w-28" onClick={() => setIsOpen(false)}>
              {adminCopy.common.close}
            </Button>
            <Button type="submit" className="h-[42px] w-full sm:w-36" isLoading={isPending}>
              {copy.createInvite}
            </Button>
          </div>
        </form>

        {lastInvite && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
            <p className="mb-2 text-xs font-medium uppercase text-slate-400">{copy.inviteLink}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={lastInvite.inviteUrl}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600/50 dark:bg-slate-800 dark:text-slate-200"
              />
              <Button type="button" variant="outline" className="h-[42px] w-full sm:w-28" onClick={copyInviteLink}>
                <Copy className="h-4 w-4" />
                {copy.copy}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {copy.expiresOn} {formatDate(lastInvite.expiresAt, locale)}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
