'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { AlertTriangle, ArrowRight, CalendarClock, Check, CheckCircle2, Clock3, CreditCard, Globe, KeyRound, LayoutDashboard, LifeBuoy, ReceiptText, Palette, Shield, Trash2, User } from 'lucide-react';
import Swal from 'sweetalert2';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/layout/ThemeToggle';
import CollaboratorsList from '@/components/settings/CollaboratorsList';
import NotificationSettings from '@/components/settings/NotificationSettings';
import StartTrialButton from '@/components/subscription/StartTrialButton';
import Select from '@/components/ui/Select';
import Loader from '@/components/ui/Loader';
import {
  clearMyDataAction,
  deleteMyAccountAction,
  getActiveSubscriptionPackagesAction,
  updateCurrencyAction,
  updateFinancialMonthStartDayAction,
  updateExperienceModeAction,
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
import { formatCurrency, formatDate } from '@/lib/utils';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import type { SubscriptionInterval, SubscriptionPlan, SubscriptionSource, SubscriptionStatus, UserExperienceMode } from '@/types';

type AppPinStatus = { hasPin: boolean; pinSetAt: string | null };
type SettingsSubscriptionSnapshot = {
  plan: SubscriptionPlan | null;
  interval: SubscriptionInterval | null;
  packageId: string | null;
  source: SubscriptionSource | null;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export default function SettingsPageClient({
  initialAppPinStatus,
  initialExperienceMode,
  initialFinancialMonthStartDay,
  initialSubscription,
}: {
  initialAppPinStatus: AppPinStatus;
  initialExperienceMode: UserExperienceMode;
  initialFinancialMonthStartDay: number;
  initialSubscription: SettingsSubscriptionSnapshot;
}) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackageRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isPinPending, startPinTransition] = useTransition();
  const [isClearPending, startClearTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
  const [isLocaleUpdating, setIsLocaleUpdating] = useState(false);
  const [isExperienceModeUpdating, setIsExperienceModeUpdating] = useState(false);
  const [isFinancialMonthUpdating, setIsFinancialMonthUpdating] = useState(false);
  const [financialMonthStartDay, setFinancialMonthStartDay] = useState(initialFinancialMonthStartDay);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [appPinStatus, setAppPinStatus] = useState<AppPinStatus>(initialAppPinStatus);
  const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'billing' | 'security' | 'community'>('account');
  const [recreateStarterData, setRecreateStarterData] = useState(true);
  const [renderedAt] = useState(() => Date.now());
  
  const currentCurrency = (session?.user as { currency?: string } | undefined)?.currency || 'BDT';
  const currentExperienceMode = session?.user?.experienceMode || initialExperienceMode || 'FULL';
  const userLocale = session?.user?.preferredLocale;
  const subscriptionPlan = initialSubscription.plan;
  const subscriptionInterval = initialSubscription.interval;
  const subscriptionPackageId = initialSubscription.packageId;
  const subscriptionSource = initialSubscription.source;
  const subscriptionStatus = initialSubscription.status;
  const subscriptionPeriodEnd = initialSubscription.currentPeriodEnd
    ? formatDate(initialSubscription.currentPeriodEnd, undefined, userLocale)
    : null;
  const subscriptionEndDate = initialSubscription.currentPeriodEnd
    ? new Date(initialSubscription.currentPeriodEnd)
    : null;
  const isAdmin = session?.user?.role === 'ADMIN';
  const hasActiveSubscription = isAdmin || (
    subscriptionPlan === 'PRO' &&
    (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING') &&
    (!initialSubscription.currentPeriodEnd || new Date(initialSubscription.currentPeriodEnd) >= new Date())
  );
  const canUpgradeFromTrial = !isAdmin && hasActiveSubscription && subscriptionStatus === 'TRIALING';
  const canStartTrial = !isAdmin && !subscriptionPlan;
  const isActiveTrialAccess = hasActiveSubscription && subscriptionStatus === 'TRIALING';
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

  const handleExperienceModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextMode = e.target.value as UserExperienceMode;
    setIsExperienceModeUpdating(true);
    const result = await updateExperienceModeAction(nextMode);
    if (result.success && result.data) {
      await update({ experienceMode: result.data.experienceMode });
      router.refresh();
    }
    setIsExperienceModeUpdating(false);
  };

  const handleFinancialMonthChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const previousDay = financialMonthStartDay;
    const nextDay = Number(e.target.value);
    setFinancialMonthStartDay(nextDay);
    setIsFinancialMonthUpdating(true);
    const result = await updateFinancialMonthStartDayAction(nextDay);
    if (result.success) {
      router.refresh();
    } else {
      setFinancialMonthStartDay(previousDay);
    }
    setIsFinancialMonthUpdating(false);
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

  const handleClearData = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Clear all app data?',
      html: `
        <div class="text-left text-sm leading-6">
          <p>This will permanently remove your accounts, transactions, budgets, goals, recurring items, service tracker, investments, notes, salary plans, and related notifications.</p>
          <p class="mt-2 font-semibold">Your login, subscription, payment history, support tickets, language, currency, and PIN will stay.</p>
          <p class="mt-3">Type <b>CLEAR</b> to confirm.</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'CLEAR',
      showCancelButton: true,
      confirmButtonText: 'Clear data',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl border border-white/70 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
        title: 'text-2xl font-black text-slate-950 dark:text-slate-100',
        htmlContainer: 'text-sm leading-6 text-slate-600 dark:text-slate-300',
        input: 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        confirmButton: 'inline-flex min-h-11 min-w-28 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700',
        cancelButton: 'mr-2 inline-flex min-h-11 min-w-24 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
      },
      preConfirm: (value) => {
        if (String(value || '').trim().toUpperCase() !== 'CLEAR') {
          Swal.showValidationMessage('Type CLEAR to confirm.');
          return false;
        }
        return value;
      },
    });

    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.set('confirmation', 'CLEAR');
    if (recreateStarterData) formData.set('recreateStarterData', 'on');

    startClearTransition(async () => {
      const response = await clearMyDataAction(formData);
      await Swal.fire({
        icon: response.success ? 'success' : 'error',
        title: response.success ? 'Data reset complete' : 'Reset failed',
        text: response.message,
        confirmButtonText: 'OK',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-3xl border border-white/70 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          title: 'text-2xl font-black text-slate-950 dark:text-slate-100',
          htmlContainer: 'text-sm leading-6 text-slate-600 dark:text-slate-300',
          confirmButton: `${response.success ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'} inline-flex min-h-11 min-w-28 items-center justify-center rounded-2xl px-5 text-sm font-bold text-white shadow-lg transition`,
        },
      });
      if (response.success) router.refresh();
    });
  };

  const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete your account?',
      html: `
        <div class="text-left text-sm leading-6">
          <p>Your login will be removed and your email will be available for registration again.</p>
          <p class="mt-2">Admins may still see a deleted, anonymized account record for audit history.</p>
          <p class="mt-3 font-semibold">Type <b>DELETE</b> to confirm.</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'DELETE',
      showCancelButton: true,
      confirmButtonText: 'Delete account',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl border border-white/70 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
        title: 'text-2xl font-black text-slate-950 dark:text-slate-100',
        htmlContainer: 'text-sm leading-6 text-slate-600 dark:text-slate-300',
        input: 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        confirmButton: 'inline-flex min-h-11 min-w-32 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700',
        cancelButton: 'mr-2 inline-flex min-h-11 min-w-24 items-center justify-center rounded-2xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
      },
      preConfirm: (value) => {
        if (String(value || '').trim().toUpperCase() !== 'DELETE') {
          Swal.showValidationMessage('Type DELETE to confirm.');
          return false;
        }
        return value;
      },
    });

    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.set('confirmation', 'DELETE');

    startDeleteTransition(async () => {
      const response = await deleteMyAccountAction(formData);
      if (!response.success) {
        await Swal.fire({
          icon: 'error',
          title: 'Delete failed',
          text: response.message,
          confirmButtonText: 'OK',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-3xl border border-white/70 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
            title: 'text-2xl font-black text-slate-950 dark:text-slate-100',
            confirmButton: 'inline-flex min-h-11 min-w-28 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700',
          },
        });
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Account deleted',
        text: response.message,
        confirmButtonText: 'Go to login',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-3xl border border-white/70 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          title: 'text-2xl font-black text-slate-950 dark:text-slate-100',
          confirmButton: 'inline-flex min-h-11 min-w-28 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700',
        },
      });
      await signOut({ callbackUrl: '/login' });
    });
  };

  const isTrialPackage = (pkg: SubscriptionPackageRow) => pkg.price === 0 && pkg.trialDays > 0;

  const planLabel = () => {
    if (isAdmin) return 'Admin access';
    if (subscriptionPlan !== 'PRO') return 'Subscription required';
    if (subscriptionSource === 'ADMIN_GRANT') return subscriptionPeriodEnd ? 'Admin granted access' : 'Admin granted unlimited access';
    const currentPackage = packages.find((pkg) => pkg.id === subscriptionPackageId);
    if (currentPackage && isTrialPackage(currentPackage) && !isActiveTrialAccess) return 'Trial ended';
    if (currentPackage) return currentPackage.name;
    return `Pro ${subscriptionInterval?.toLowerCase() || ''}`;
  };

  const isCurrentPackage = (packageId: string, interval: string) => {
    if (subscriptionSource !== 'SELF_SERVICE') return false;
    if (subscriptionPackageId) return subscriptionPackageId === packageId;
    return subscriptionInterval === interval;
  };

  const currentPackage = packages.find((pkg) => pkg.id === subscriptionPackageId) || null;
  const visibleCurrentPackage = currentPackage && (!isTrialPackage(currentPackage) || isActiveTrialAccess)
    ? currentPackage
    : null;
  const visiblePackages = packages.filter((pkg) => {
    if (!isTrialPackage(pkg)) return true;
    return canStartTrial || (isActiveTrialAccess && pkg.id === subscriptionPackageId);
  });
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
      <Loader show={isLocaleUpdating} message="ভাষা আপডেট হচ্ছে..." />
      <Loader show={isExperienceModeUpdating} message="Updating workspace mode..." />
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{userName}</h1>
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
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
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
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-200 mb-2">Collaborator View</h2>
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
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Profile Information</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                      <p className="text-lg text-slate-900 dark:text-slate-200 font-semibold">{userName}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                      <p className="text-lg text-slate-900 dark:text-slate-200 font-semibold">{userEmail}</p>
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
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Appearance Settings</h2>
                    </div>
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-200">Theme Mode</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Personalize your viewing experience</p>
                      </div>
                      <ThemeToggle />
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center gap-3 mb-8">
                      <Globe className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Regional Preferences</h2>
                    </div>
                    <div className="space-y-4">
                      <LanguageSwitcher
                        label="Language / ভাষা"
                        description="Choose the app language. Default is Bangla."
                        onChanging={setIsLocaleUpdating}
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                        <div>
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-200">Base Currency</p>
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
                              { value: 'BDT', label: 'BDT (৳)' },
                              { value: 'INR', label: 'INR (₹)' },
                              { value: 'JPY', label: 'JPY (¥)' },
                              { value: 'CAD', label: 'CAD (C$)' },
                              { value: 'AUD', label: 'AUD (A$)' },
                            ]}
                            disabled={isCurrencyUpdating}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700/50 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900 dark:text-slate-200">Financial Month Start</p>
                          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Monthly dashboards, budgets, reports, and default transaction dates will start on this day. For example, day 25 creates periods from the 25th through the 24th.
                          </p>
                        </div>
                        <div className="w-full sm:w-56">
                          <Select
                            id="financialMonthStartDay"
                            value={financialMonthStartDay}
                            onChange={handleFinancialMonthChange}
                            options={Array.from({ length: 31 }, (_, index) => ({
                              value: String(index + 1),
                              label: index === 0 ? '1st (calendar month)' : `Day ${index + 1}`,
                            }))}
                            disabled={isFinancialMonthUpdating}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center gap-3 mb-8">
                      <LayoutDashboard className="h-6 w-6 text-sky-500 dark:text-sky-300" />
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Workspace Mode</h2>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-200">Experience Mode</p>
                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                          Basic keeps the app focused on daily tracking. Full unlocks planning tools like goals, investments, salary, tax, recurring items, and notes.
                        </p>
                      </div>
                      <div className="w-full sm:w-56">
                        <Select
                          id="experienceMode"
                          value={currentExperienceMode}
                          onChange={handleExperienceModeChange}
                          options={[
                            { value: 'BASIC', label: 'Basic' },
                            { value: 'FULL', label: 'Full' },
                          ]}
                          disabled={isExperienceModeUpdating}
                        />
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
                          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Billing</h2>
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
                        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-200">{planLabel()}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{accessSourceLabel}</p>
                      </div>
                      <div className="border-t border-slate-200 p-5 dark:border-slate-800 md:border-l md:border-t-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Valid until</p>
                        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-200">{subscriptionPeriodEnd || (subscriptionPlan === 'PRO' ? 'Unlimited' : '-')}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {daysRemaining !== null && hasActiveSubscription ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining` : 'Renewal opens after expiry'}
                        </p>
                      </div>
                      <div className="border-t border-slate-200 p-5 dark:border-slate-800 md:border-l md:border-t-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment flow</p>
                        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-200">Manual review</p>
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
                            <p className="font-bold text-slate-900 dark:text-slate-200">Your payment is already approved</p>
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
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">Available packages</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {canUpgradeFromTrial
                            ? 'Your trial is active. You can upgrade to a paid package now.'
                            : hasActiveSubscription && !isAdmin
                              ? 'Package changes are available when your current access expires.'
                              : 'Choose a package and submit payment details for admin approval.'}
                        </p>
                      </div>
                      {visibleCurrentPackage && (
                        <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <ReceiptText className="h-4 w-4" />
                          Current: {visibleCurrentPackage.name}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {visiblePackages.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-400 md:col-span-2">
                          No subscription packages are currently available.
                        </div>
                      ) : visiblePackages.map((pkg) => {
                        const currentPlan = isCurrentPackage(pkg.id, pkg.interval);
                        const canPayNow = !isAdmin && (!hasActiveSubscription || canUpgradeFromTrial) && !isTrialPackage(pkg);
                        return (
                          <div key={pkg.id} className={`flex min-h-full flex-col rounded-2xl border p-5 ${pkg.isFeatured ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-900/30'}`}>
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">{pkg.name}</h3>
                                  {pkg.isFeatured && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Recommended</span>}
                                  {pkg.discountLabel && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{pkg.discountLabel}</span>}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{pkg.description}</p>
                              </div>
                              {currentPlan && <Check className="h-5 w-5 shrink-0 text-emerald-500" />}
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-slate-200">
                              {isTrialPackage(pkg) ? `${pkg.trialDays} days` : formatCurrency(pkg.price, pkg.currency, userLocale)}
                              {!isTrialPackage(pkg) && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{pkg.interval === 'YEARLY' ? '/yr' : '/mo'}</span>}
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <CalendarClock className="h-4 w-4" />
                              {isTrialPackage(pkg) ? 'Trial access without payment' : pkg.interval === 'YEARLY' ? 'Yearly access' : 'Monthly access'}
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
                              {canPayNow && isTrialPackage(pkg) ? (
                                <StartTrialButton packageId={pkg.id} />
                              ) : canPayNow ? (
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
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Security & Privacy</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50">
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-200">Account Password</p>
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
                              <p className="text-base font-semibold text-slate-900 dark:text-slate-200">App PIN</p>
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

                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 dark:border-rose-500/30 dark:bg-rose-500/10">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-950 dark:text-slate-100">Clear all app data</p>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                              Remove your finance workspace data and start again. Your account, subscription, manual payment history, support tickets, language, currency, and PIN will not be deleted.
                            </p>
                            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200 bg-white/70 p-3 text-sm font-semibold text-slate-700 dark:border-rose-500/30 dark:bg-slate-950/30 dark:text-slate-200">
                              <input
                                type="checkbox"
                                checked={recreateStarterData}
                                onChange={(event) => setRecreateStarterData(event.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                              />
                              <span>
                                Recreate starter categories and a Cash account after clearing
                                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                                  Turn this off if you want a completely blank workspace with no preconfigured data.
                                </span>
                              </span>
                            </label>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                          <Button
                            type="button"
                            variant="danger"
                            size="md"
                            onClick={handleClearData}
                            isLoading={isClearPending}
                          >
                            Clear data
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="md"
                            onClick={handleDeleteAccount}
                            isLoading={isDeletePending}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            Delete account
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
