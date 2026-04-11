'use client';

import { useSession } from 'next-auth/react';
import { User, Shield, Palette, Globe } from 'lucide-react';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/layout/ThemeToggle';
import CollaboratorsList from '@/components/settings/CollaboratorsList';
import Select from '@/components/ui/Select';
import Loader from '@/components/ui/Loader';
import { updateCurrencyAction } from '@/actions/settings.actions';

import { useEffect, useState, useTransition } from 'react';
import { getAccessibleWorkspacesAction } from '@/actions/ui.actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/auth';
import { changePasswordAction } from '@/actions/auth.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const currentCurrency = (session?.user as any)?.currency || 'USD';

  useEffect(() => {
    getAccessibleWorkspacesAction().then(res => setActiveId(res.activeId));
  }, []);

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    setIsCurrencyUpdating(true);
    const result = await updateCurrencyAction(newCurrency);
    if (result.success) {
      await update({ currency: newCurrency });
    }
    setIsCurrencyUpdating(false);
  };

  const isPersonalWorkspace = !activeId || activeId === session?.user?.id;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordInput>({
      resolver: zodResolver(changePasswordSchema),
  });
    const onSubmit = async (data: ChangePasswordInput) => {
        setMessage(null);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.set(key, value));

        startTransition(async () => {
            const result = await changePasswordAction(formData);
            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                setTimeout(() => {
                    setIsModalOpen(false);
                    reset();
                    setMessage(null);
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.message });
            }
        });
    };
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Loader show={isCurrencyUpdating} message="Updating currency..." />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account preferences</p>
      </div>

      {/* Profile */}
      {isPersonalWorkspace ? (
        <>
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Name</label>
                <p className="text-slate-900 dark:text-white">{session?.user?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Email</label>
                <p className="text-slate-900 dark:text-white">{session?.user?.email || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Palette className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-900 dark:text-white">Theme</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Toggle dark/light mode</p>
              </div>
              <ThemeToggle />
            </div>
          </Card>

          {/* Preferences */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferences</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-slate-900 dark:text-white">Base Currency</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Global formatting preference</p>
                </div>
                <div className="w-32">
                  <Select
                    id="currency"
                    value={currentCurrency}
                    onChange={handleCurrencyChange}
                    options={[
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'GBP', label: 'GBP (£)' },
                      { value: 'BDT', label: 'BDT (English Digits)' },
                      { value: 'BDT_BN', label: 'BDT (Bengali Digits)' },
                      { value: 'INR', label: 'INR (₹)' },
                      { value: 'JPY', label: 'JPY (¥)' },
                      { value: 'CAD', label: 'CAD (C$)' },
                      { value: 'AUD', label: 'AUD (A$)' },
                    ]}
                    disabled={isCurrencyUpdating}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Sharing & Collaboration */}
          <CollaboratorsList />

          {/* Security */}
            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Security</h2>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-900 dark:text-white">Password</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Keep your account secure</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
                        Change Password
                    </Button>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Change Password">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {message && (
                        <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                            {message.text}
                        </div>
                    )}
                    <Input
                        id="currentPassword"
                        label="Current Password"
                        type="password"
                        error={errors.currentPassword?.message}
                        {...register('currentPassword')}
                    />
                    <Input
                        id="newPassword"
                        label="New Password"
                        type="password"
                        error={errors.newPassword?.message}
                        {...register('newPassword')}
                    />
                    <Input
                        id="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        error={errors.confirmPassword?.message}
                        {...register('confirmPassword')}
                    />
                    <Button type="submit" className="w-full" isLoading={isPending}>
                        Update Password
                    </Button>
                </form>
            </Modal>
        </>
      ) : (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Collaborator View</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Personal settings and sharing options are disabled while you are viewing someone else's workspace.
          </p>
        </Card>
      )}
    </div>
  );
}
