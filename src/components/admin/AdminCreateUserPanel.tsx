'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { ClipboardCopy, RotateCcw, UserRoundPlus } from 'lucide-react';
import {
  createUserWithTemporaryPasswordAction,
  type AdminCreateUserResult,
  type AdminSubscriptionPackageRow,
} from '@/actions/admin.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';

type AdminCreateUserPanelProps = {
  packages: AdminSubscriptionPackageRow[];
};

const roleOptions = [
  { value: 'USER', label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
];

function generateTemporaryPassword() {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `Ft-${random[0].toString(36)}-${random[1].toString(36)}`.slice(0, 18);
}

function formatUserDetails(user: AdminCreateUserResult, appOrigin: string) {
  return [
    'FinTrack account details',
    '',
    `Login URL: ${appOrigin}/login`,
    `Name: ${user.name}`,
    `Email: ${user.email}`,
    `Role: ${user.role === 'ADMIN' ? 'Admin' : 'User'}`,
    `Package: ${user.packageName || 'No package'}`,
    `Temporary password: ${user.temporaryPassword}`,
    '',
    'First login requirement:',
    'After signing in, you must create a new password before you can use the app.',
  ].join('\n');
}

export default function AdminCreateUserPanel({ packages }: AdminCreateUserPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [appOrigin, setAppOrigin] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState(generateTemporaryPassword);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createdUser, setCreatedUser] = useState<AdminCreateUserResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const packageOptions = [
    { value: '', label: 'No package' },
    ...packages.filter((pkg) => pkg.isActive).map((pkg) => ({ value: pkg.id, label: pkg.name })),
  ];

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  const openModal = () => {
    setMessage(null);
    setCreatedUser(null);
    setTemporaryPassword(generateTemporaryPassword());
    setIsOpen(true);
  };

  const createUser = (formData: FormData) => {
    setMessage(null);
    setCreatedUser(null);
    startTransition(async () => {
      const result = await createUserWithTemporaryPasswordAction(formData);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success && result.data) {
        setCreatedUser(result.data);
      }
      router.refresh();
    });
  };

  const copyUserDetails = async () => {
    if (!createdUser) return;
    await navigator.clipboard.writeText(formatUserDetails(createdUser, appOrigin || window.location.origin));
    setMessage({ type: 'success', text: 'User details copied' });
  };

  return (
    <>
      <Button type="button" className="w-full sm:w-auto" onClick={openModal}>
        <UserRoundPlus className="h-4 w-4" />
        Add User
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add User" className="max-w-2xl">
        <Loader show={isPending} message="Creating user..." />

        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Create an active account with a temporary password. The user must set a new password before using the app.
        </p>

        {message && (
          <div className={`mb-4 rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {message.text}
          </div>
        )}

        <form action={createUser} className="grid gap-4 sm:grid-cols-2">
          <Input id="createUserName" name="name" label="Name" placeholder="New user name" required />
          <Input id="createUserEmail" name="email" label="Email" type="email" placeholder="user@example.com" required />
          <Select id="createUserRole" name="role" label="Role" defaultValue="USER" options={roleOptions} />
          <Select id="createUserPackageId" name="packageId" label="Package" defaultValue="" options={packageOptions} />
          <div className="sm:col-span-2">
            <Input
              id="temporaryPassword"
              name="temporaryPassword"
              label="Temporary Password"
              value={temporaryPassword}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-[42px] w-full sm:w-28" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button type="button" variant="outline" className="h-[42px] w-full sm:w-32" onClick={() => setTemporaryPassword(generateTemporaryPassword())}>
              <RotateCcw className="h-4 w-4" />
              Generate
            </Button>
            <Button type="submit" className="h-[42px] w-full sm:w-32" isLoading={isPending}>
              Create User
            </Button>
          </div>
        </form>

        {createdUser && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Created User Details</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{createdUser.name}</p>
              </div>
              <Button type="button" variant="outline" className="h-[42px] w-full sm:w-40" onClick={copyUserDetails}>
                <ClipboardCopy className="h-4 w-4" />
                Copy Details
              </Button>
            </div>
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700/50 dark:bg-slate-950/40 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-slate-400">Login URL</p>
                <p className="truncate font-medium text-slate-700 dark:text-slate-200">{appOrigin ? `${appOrigin}/login` : '/login'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-slate-400">Email</p>
                <p className="truncate font-medium text-slate-700 dark:text-slate-200">{createdUser.email}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-slate-400">Role</p>
                <p className="truncate font-medium text-slate-700 dark:text-slate-200">{createdUser.role === 'ADMIN' ? 'Admin' : 'User'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-slate-400">Package</p>
                <p className="truncate font-medium text-slate-700 dark:text-slate-200">{createdUser.packageName || 'No package'}</p>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <p className="text-xs font-medium uppercase text-slate-400">Temporary Password</p>
                <p className="break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-white">
                  {createdUser.temporaryPassword}
                </p>
              </div>
            </div>
            <textarea
              readOnly
              value={formatUserDetails(createdUser, appOrigin || '')}
              className="mt-3 h-40 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-600/50 dark:bg-slate-800 dark:text-slate-200"
            />
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              This temporary password cannot be skipped for later. The user must set a new password immediately after first login.
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
