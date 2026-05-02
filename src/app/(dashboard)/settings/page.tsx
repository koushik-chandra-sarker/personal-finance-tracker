'use client';

import { useSession } from 'next-auth/react';
import { Check, CreditCard, Globe, Palette, Shield, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/layout/ThemeToggle';
import CollaboratorsList from '@/components/settings/CollaboratorsList';
import NotificationSettings from '@/components/settings/NotificationSettings';
import Select from '@/components/ui/Select';
import Loader from '@/components/ui/Loader';
import {
  getSubscriptionUsersAction,
  grantUserAccessAction,
  revokeUserAccessAction,
  updateCurrencyAction,
  updateSubscriptionAction,
} from '@/actions/settings.actions';

import { useEffect, useState, useTransition } from 'react';
import { getAccessibleWorkspacesAction } from '@/actions/ui.actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/auth';
import { changePasswordAction } from '@/actions/auth.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import type { SubscriptionInterval } from '@/types';

type SubscriptionUser = Awaited<ReturnType<typeof getSubscriptionUsersAction>>[number];
const MONTHLY_PRICE = 999;
const YEARLY_PRICE = 9990;

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSubscriptionPending, startSubscriptionTransition] = useTransition();
  const [isAdminPending, startAdminTransition] = useTransition();
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'billing' | 'security' | 'community'>('account');
  const [subscriptionUsers, setSubscriptionUsers] = useState<SubscriptionUser[]>([]);
  
  const currentCurrency = (session?.user as { currency?: string } | undefined)?.currency || 'USD';
  const subscriptionPlan = session?.user?.subscriptionPlan || null;
  const subscriptionInterval = session?.user?.subscriptionInterval || null;
  const subscriptionSource = session?.user?.subscriptionSource || null;
  const subscriptionStatus = session?.user?.subscriptionStatus || 'ACTIVE';
  const subscriptionPeriodEnd = session?.user?.subscriptionCurrentPeriodEnd
    ? new Date(session.user.subscriptionCurrentPeriodEnd).toLocaleDateString()
    : null;
  const isAdmin = session?.user?.role === 'ADMIN';
  const hasActiveSubscription = isAdmin || (
    subscriptionPlan === 'PRO' &&
    (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING') &&
    (!session?.user?.subscriptionCurrentPeriodEnd || new Date(session.user.subscriptionCurrentPeriodEnd) >= new Date())
  );
  const currentTab = session && !hasActiveSubscription ? 'billing' : activeTab;
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

  const activateSubscription = (interval: SubscriptionInterval) => {
    setSubscriptionMessage(null);
    startSubscriptionTransition(async () => {
      const result = await updateSubscriptionAction(interval);
      if (result.success && result.data) {
        await update(result.data);
        setSubscriptionMessage({ type: 'success', text: result.message });
      } else {
        setSubscriptionMessage({ type: 'error', text: result.message });
      }
    });
  };

  const refreshSubscriptionUsers = () => {
    setSubscriptionMessage(null);
    startAdminTransition(async () => {
      try {
        const users = await getSubscriptionUsersAction();
        setSubscriptionUsers(users);
      } catch (error) {
        setSubscriptionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load users' });
      }
    });
  };

  const grantAccess = (formData: FormData) => {
    setSubscriptionMessage(null);
    startAdminTransition(async () => {
      const result = await grantUserAccessAction(formData);
      setSubscriptionMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        const users = await getSubscriptionUsersAction();
        setSubscriptionUsers(users);
      }
    });
  };

  const revokeAccess = (email: string) => {
    setSubscriptionMessage(null);
    startAdminTransition(async () => {
      const result = await revokeUserAccessAction(email);
      setSubscriptionMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        const users = await getSubscriptionUsersAction();
        setSubscriptionUsers(users);
      }
    });
  };

  const formatAccessUntil = (date: string | null) => {
    return date ? new Date(date).toLocaleDateString() : 'Unlimited';
  };

  const planLabel = () => {
    if (isAdmin) return 'Admin access';
    if (subscriptionPlan !== 'PRO') return 'Subscription required';
    if (subscriptionSource === 'ADMIN_GRANT') return subscriptionPeriodEnd ? 'Admin granted access' : 'Admin granted unlimited access';
    return `Pro ${subscriptionInterval?.toLowerCase() || ''}`;
  };

  const handleTabClick = (tabId: typeof activeTab) => {
    if (session && !hasActiveSubscription && tabId !== 'billing') {
      setSubscriptionMessage({ type: 'error', text: 'Subscribe or get admin-granted access to continue.' });
      return;
    }
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
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
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                    currentTab === tab.id
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
              {currentTab === 'account' && (
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

              {currentTab === 'preferences' && (
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

              {currentTab === 'billing' && (
                <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 mb-8">
                    <CreditCard className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Subscription</h2>
                  </div>

                  <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Access</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {planLabel()}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Status: {subscriptionStatus.toLowerCase()}
                          {subscriptionPeriodEnd ? ` · Valid until ${subscriptionPeriodEnd}` : subscriptionPlan === 'PRO' ? ' · Unlimited' : ''}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                          Admin
                        </div>
                      )}
                    </div>
                  </div>

                  {subscriptionMessage && (
                    <div className={`mb-6 p-3 rounded-xl text-sm ${subscriptionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                      {subscriptionMessage.text}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro Monthly</h3>
                        {subscriptionSource === 'SELF_SERVICE' && subscriptionInterval === 'MONTHLY' && <Check className="h-5 w-5 text-emerald-500" />}
                      </div>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{formatCurrency(MONTHLY_PRICE, 'BDT')}<span className="text-sm font-medium text-slate-500 dark:text-slate-400">/mo</span></p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Continue with full access billed monthly in BDT.</p>
                      <Button onClick={() => activateSubscription('MONTHLY')} disabled={isSubscriptionPending || (subscriptionSource === 'SELF_SERVICE' && subscriptionInterval === 'MONTHLY')} className="w-full">
                        {subscriptionSource === 'SELF_SERVICE' && subscriptionInterval === 'MONTHLY' ? 'Current Monthly' : 'Choose Monthly'}
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/30 p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro Yearly</h3>
                        {subscriptionSource === 'SELF_SERVICE' && subscriptionInterval === 'YEARLY' && <Check className="h-5 w-5 text-emerald-500" />}
                      </div>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{formatCurrency(YEARLY_PRICE, 'BDT')}<span className="text-sm font-medium text-slate-500 dark:text-slate-400">/yr</span></p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Continue with full access billed yearly in BDT.</p>
                      <Button onClick={() => activateSubscription('YEARLY')} disabled={isSubscriptionPending || (subscriptionSource === 'SELF_SERVICE' && subscriptionInterval === 'YEARLY')} className="w-full">
                        {subscriptionSource === 'SELF_SERVICE' && subscriptionInterval === 'YEARLY' ? 'Current Yearly' : 'Choose Yearly'}
                      </Button>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-8 border-t border-slate-200 dark:border-slate-700/50 pt-8">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Admin Access Grants</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Grant full access by user email for a fixed period or unlimited.</p>
                        </div>
                        <Button variant="outline" onClick={refreshSubscriptionUsers} disabled={isAdminPending}>
                          Load Users
                        </Button>
                      </div>

                      <form action={grantAccess} className="grid gap-3 md:grid-cols-[1fr_180px_auto] mb-6">
                        <Input id="grantEmail" name="email" type="email" label="User Email" placeholder="user@example.com" required />
                        <div>
                          <label htmlFor="grantDuration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                          <select
                            id="grantDuration"
                            name="duration"
                            defaultValue="MONTHLY"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="MONTHLY">1 Month</option>
                            <option value="YEARLY">1 Year</option>
                            <option value="UNLIMITED">Unlimited</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button type="submit" disabled={isAdminPending} className="w-full">Grant</Button>
                        </div>
                      </form>

                      {subscriptionUsers.length > 0 && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50">
                          {subscriptionUsers.map((user) => (
                            <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 last:border-b-0 dark:border-slate-700/50 p-4">
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  {user.role}
                                  {user.subscription
                                    ? ` · ${user.subscription.source.toLowerCase().replace('_', ' ')} · ${formatAccessUntil(user.subscription.currentPeriodEnd)}`
                                    : ' · no access'}
                                </p>
                              </div>
                              {user.role !== 'ADMIN' && user.subscription && (
                                <Button variant="outline" size="sm" onClick={() => revokeAccess(user.email)} disabled={isAdminPending}>
                                  Revoke
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {currentTab === 'security' && (
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

              {currentTab === 'community' && (
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
