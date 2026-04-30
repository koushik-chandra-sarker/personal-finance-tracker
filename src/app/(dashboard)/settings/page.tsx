'use client';

import { useSession } from 'next-auth/react';
import { User, Shield, Palette, Globe } from 'lucide-react';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/layout/ThemeToggle';
import CollaboratorsList from '@/components/settings/CollaboratorsList';
import NotificationSettings from '@/components/settings/NotificationSettings';
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
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'security' | 'community'>('account');
  
  const currentCurrency = (session?.user as { currency?: string } | undefined)?.currency || 'USD';
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const initial = userName.charAt(0).toUpperCase();

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

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'community', label: 'Community', icon: Globe },
  ] as const;

  return (
    <div className="w-full space-y-8 pb-10">
      <Loader show={isCurrencyUpdating} message="Updating currency..." />
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{userName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{userEmail}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl lg:bg-transparent lg:dark:bg-transparent">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm lg:shadow-none lg:bg-indigo-500 lg:dark:bg-indigo-500/10 lg:text-white lg:dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline-block">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {!isPersonalWorkspace ? (
            <Card className="max-w-3xl">
              <div className="flex flex-col items-center text-center py-12">
                <Shield className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Collaborator View</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Personal settings and security options are disabled while you are viewing someone&apos;s workspace.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 max-w-4xl">
              {activeTab === 'account' && (
                <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 mb-8">
                    <User className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Information</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                      <p className="text-lg text-slate-900 dark:text-white font-semibold">{userName}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                      <p className="text-lg text-slate-900 dark:text-white font-semibold">{userEmail}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account ID</label>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all">{session?.user?.id}</p>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card>
                    <div className="flex items-center gap-3 mb-8">
                      <Palette className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Appearance Settings</h2>
                    </div>
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">Theme Mode</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Personalize your viewing experience</p>
                      </div>
                      <ThemeToggle />
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center gap-3 mb-8">
                      <Globe className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Regional Preferences</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                        <div>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">Base Currency</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">The primary currency for tracking your wealth</p>
                        </div>
                        <div className="w-full sm:w-56">
                          <Select
                            id="currency"
                            value={currentCurrency}
                            onChange={handleCurrencyChange}
                            options={[
                              { value: 'USD', label: 'USD ($)' },
                              { value: 'EUR', label: 'EUR (€)' },
                              { value: 'GBP', label: 'GBP (£)' },
                              { value: 'BDT', label: 'BDT (English)' },
                              { value: 'BDT_BN', label: 'BDT (Bengali)' },
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

                  <NotificationSettings />
                </div>
              )}

              {activeTab === 'security' && (
                <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 mb-8">
                    <Shield className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Privacy</h2>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">Account Password</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Regularly update your password to maintain high security</p>
                    </div>
                    <Button variant="secondary" size="md" onClick={() => setIsModalOpen(true)}>
                      Change Password
                    </Button>
                  </div>
                </Card>
              )}

              {activeTab === 'community' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <CollaboratorsList />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Change Password">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {message && (
            <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              {message.text}
            </div>
          )}
          <Input id="currentPassword" label="Current Password" type="password" error={errors.currentPassword?.message} {...register('currentPassword')} />
          <Input id="newPassword" label="New Password" type="password" error={errors.newPassword?.message} {...register('newPassword')} />
          <Input id="confirmPassword" label="Confirm New Password" type="password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <Button type="submit" className="w-full" isLoading={isPending}>Update Password</Button>
        </form>
      </Modal>
    </div>
  );
}
