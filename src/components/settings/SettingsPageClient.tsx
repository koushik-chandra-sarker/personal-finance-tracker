'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, CalendarClock, Check, CheckCircle2, Clock3, CreditCard, Globe, KeyRound, LifeBuoy, ReceiptText, Palette, Shield, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/layout/ThemeToggle';
import CollaboratorsList from '@/components/settings/CollaboratorsList';
import NotificationSettings from '@/components/settings/NotificationSettings';
import Select from '@/components/ui/Select';
import Loader from '@/components/ui/Loader';
import {
  getActiveSubscriptionPackagesAction,
  updateCurrencyAction,
  type SubscriptionPackageRow,
} from '@/actions/settings.actions';

import { useEffect, useState, useTransition } from 'react';
import { getAccessibleWorkspacesAction } from '@/actions/ui.actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/auth';
import { changePasswordAction } from '@/actions/auth.actions';
import { createAppPinAction } from '@/actions/app-pin.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';

type AppPinStatus = { hasPin: boolean; pinSetAt: string | null };

export default function SettingsPageClient({ initialAppPinStatus }: { initialAppPinStatus: AppPinStatus }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackageRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isPinPending, startPinTransition] = useTransition();
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [appPinStatus, setAppPinStatus] = useState<AppPinStatus>(initialAppPinStatus);
  const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'billing' | 'security' | 'community'>('account');
  const [renderedAt] = useState(() => Date.now());
  
  const currentCurrency = (session?.user as { currency?: string } | undefined)?.currency || 'USD';
  const subscriptionPlan = session?.user?.subscriptionPlan || null;
  const subscriptionInterval = session?.user?.subscriptionInterval || null;
  const subscriptionPackageId = session?.user?.subscriptionPackageId || null;
  const subscriptionSource = session?.user?.subscriptionSource || null;
  const subscriptionStatus = session?.user?.subscriptionStatus || 'ACTIVE';
  const subscriptionPeriodEnd = session?.user?.subscriptionCurrentPeriodEnd
    ? new Date(session.user.subscriptionCurrentPeriodEnd).toLocaleDateString()
    : null;
  const subscriptionEndDate = session?.user?.subscriptionCurrentPeriodEnd
    ? new Date(session.user.subscriptionCurrentPeriodEnd)
    : null;
  const isAdmin = session?.user?.role === 'ADMIN';
  const hasActiveSubscription = isAdmin || (
    subscriptionPlan === 'PRO' &&
    (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING') &&
    (!session?.user?.subscriptionCurrentPeriodEnd || new Date(session.user.subscriptionCurrentPeriodEnd) >= new Date())
  );
  const daysRemaining = subscriptionEndDate
    ? Math.max(0, Math.ceil((subscriptionEndDate.getTime() - renderedAt) / (1000 * 60 * 60 * 24)))
    : null;
  const currentTab = session && !hasActiveSubscription ? 'billing' : activeTab;
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const initial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    getAccessibleWorkspacesAction().then(res => setActiveId(res.activeId));
    getActiveSubscriptionPackagesAction().then(setPackages);
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

  const handleAppPinSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPinMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startPinTransition(async () => {
      const result = await createAppPinAction(formData);
      setPinMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        const unlockKey = result.data?.unlockKey || new Date().toISOString();
        setAppPinStatus({ hasPin: true, pinSetAt: unlockKey });
        if (session?.user?.id) {
          sessionStorage.setItem(`pft:app-pin:tab-unlock:${session.user.id}:${unlockKey}`, '1');
        }
        router.refresh();
        form.reset();
        setTimeout(() => {
          setIsPinModalOpen(false);
          setPinMessage(null);
        }, 1600);
      }
    });
  };

  const planLabel = () => {
    if (isAdmin) return 'Admin access';
    if (subscriptionPlan !== 'PRO') return 'Subscription required';
    if (subscriptionSource === 'ADMIN_GRANT') return subscriptionPeriodEnd ? 'Admin granted access' : 'Admin granted unlimited access';
    const currentPackage = packages.find((pkg) => pkg.id === subscriptionPackageId);
    if (currentPackage) return currentPackage.name;
    return `Pro ${subscriptionInterval?.toLowerCase() || ''}`;
  };

  const isCurrentPackage = (packageId: string, interval: string) => {
    if (subscriptionSource !== 'SELF_SERVICE') return false;
    if (subscriptionPackageId) return subscriptionPackageId === packageId;
    return subscriptionInterval === interval;
  };

  const currentPackage = packages.find((pkg) => pkg.id === subscriptionPackageId) || null;
  const statusLabel = isAdmin
    ? 'Admin'
    : hasActiveSubscription
      ? subscriptionStatus === 'TRIALING' ? 'Trialing' : 'Active'
      : subscriptionPlan === 'PRO' && subscriptionEndDate && subscriptionEndDate < new Date()
        ? 'Expired'
        : 'Payment required';
  const statusTone = hasActiveSubscription
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300';
  const accessSourceLabel = isAdmin
    ? 'Admin role'
    : subscriptionSource === 'ADMIN_GRANT'
      ? 'Admin granted'
      : subscriptionSource === 'SELF_SERVICE'
        ? 'Manual payment'
        : 'Not subscribed';

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
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Billing</h2>
                          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Manage your access, review package options, and submit manual payment when renewal is needed.
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${statusTone}`}>
                        {hasActiveSubscription ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                        {statusLabel}
                      </span>
                    </div>

                    <div className="grid border-t border-slate-200 dark:border-slate-800 md:grid-cols-3">
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Current access</p>
                        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{planLabel()}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{accessSourceLabel}</p>
                      </div>
                      <div className="border-t border-slate-200 p-5 dark:border-slate-800 md:border-l md:border-t-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Valid until</p>
                        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{subscriptionPeriodEnd || (subscriptionPlan === 'PRO' ? 'Unlimited' : '-')}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {daysRemaining !== null && hasActiveSubscription ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining` : 'Renewal opens after expiry'}
                        </p>
                      </div>
                      <div className="border-t border-slate-200 p-5 dark:border-slate-800 md:border-l md:border-t-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment flow</p>
                        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Manual review</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">bKash/Nagad details are verified by admin.</p>
                      </div>
                    </div>
                  </div>

                  {subscriptionMessage && (
                    <div className={`p-3 rounded-xl text-sm ${subscriptionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                      {subscriptionMessage.text}
                    </div>
                  )}

                  {hasActiveSubscription && !isAdmin && (
                    <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Your payment is already approved</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              The payment form stays hidden while your current access is active. You can renew or upgrade after the current period expires.
                            </p>
                          </div>
                        </div>
                        <Link href="/subscription/payment" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-500/10">
                          View status <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </Card>
                  )}

                  <div>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Available packages</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {hasActiveSubscription && !isAdmin ? 'Package changes are available when your current access expires.' : 'Choose a package and submit payment details for admin approval.'}
                        </p>
                      </div>
                      {currentPackage && (
                        <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <ReceiptText className="h-4 w-4" />
                          Current: {currentPackage.name}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {packages.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-400 md:col-span-2">
                          No subscription packages are currently available.
                        </div>
                      ) : packages.map((pkg) => {
                        const currentPlan = isCurrentPackage(pkg.id, pkg.interval);
                        const canPayNow = !isAdmin && !hasActiveSubscription;
                        return (
                          <div key={pkg.id} className={`flex min-h-full flex-col rounded-2xl border p-5 ${pkg.isFeatured ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/30'}`}>
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{pkg.name}</h3>
                                  {pkg.isFeatured && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Recommended</span>}
                                  {pkg.discountLabel && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{pkg.discountLabel}</span>}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{pkg.description}</p>
                              </div>
                              {currentPlan && <Check className="h-5 w-5 shrink-0 text-emerald-500" />}
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(pkg.price, pkg.currency)}<span className="text-sm font-medium text-slate-500 dark:text-slate-400">{pkg.interval === 'YEARLY' ? '/yr' : '/mo'}</span></p>
                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <CalendarClock className="h-4 w-4" />
                              {pkg.interval === 'YEARLY' ? 'Yearly access' : 'Monthly access'}
                            </div>
                            {pkg.featureBullets.length > 0 && (
                              <div className="my-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                {pkg.featureBullets.map((bullet) => (
                                  <p key={bullet} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {bullet}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="mt-auto">
                              {canPayNow ? (
                                <Link href={`/subscription/payment?packageId=${encodeURIComponent(pkg.id)}`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-700 hover:to-emerald-700">
                                  Pay manually <ArrowRight className="h-4 w-4" />
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500"
                                >
                                  {currentPlan ? 'Current package' : isAdmin ? 'Admin access active' : 'Available after expiry'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {currentTab === 'security' && (
                <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 mb-8">
                    <Shield className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Privacy</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">Account Password</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Regularly update your password to maintain high security</p>
                      </div>
                      <Button variant="secondary" size="md" onClick={() => setIsModalOpen(true)}>
                        Change Password
                      </Button>
                    </div>

                    <div className="flex flex-col gap-5 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                            <KeyRound className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-900 dark:text-white">App PIN</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${appPinStatus?.hasPin ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                                {appPinStatus?.hasPin ? 'Enabled' : 'Not set'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Protect private finance pages with a PIN for each browser tab session.
                            </p>
                            {appPinStatus?.pinSetAt && (
                              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                Last updated {new Date(appPinStatus.pinSetAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button variant="secondary" size="md" onClick={() => setIsPinModalOpen(true)}>
                          {appPinStatus?.hasPin ? 'Change PIN' : 'Create PIN'}
                        </Button>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                        Forgot your PIN? Create a support ticket and support can reset it after verification.
                        <Link href="/support" className="ml-2 inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
                          <LifeBuoy className="h-4 w-4" />
                          Go to support
                        </Link>
                      </div>
                    </div>
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

      <Modal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} title={appPinStatus?.hasPin ? 'Change App PIN' : 'Create App PIN'}>
        <form onSubmit={handleAppPinSubmit} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            Use 4 to 6 digits. After saving, this tab is unlocked. A closed tab will ask for PIN again next time.
          </div>
          {pinMessage && (
            <div className={`p-3 rounded-xl text-sm ${pinMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              {pinMessage.text}
            </div>
          )}
          <Input id="settingsAppPin" name="pin" label="PIN" type="password" inputMode="numeric" minLength={4} maxLength={6} required />
          <Input id="settingsConfirmAppPin" name="confirmPin" label="Confirm PIN" type="password" inputMode="numeric" minLength={4} maxLength={6} required />
          <Button type="submit" className="w-full" isLoading={isPinPending}>
            {appPinStatus?.hasPin ? 'Update PIN' : 'Create PIN'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
