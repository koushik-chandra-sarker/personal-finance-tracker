'use client';

import { completeOnboardingAction } from '@/actions/onboarding.actions';
import AppLogo from '@/components/brand/AppLogo';
import Button from '@/components/ui/Button';
import { LOCALE_OPTIONS, type AppLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';
import type { UserExperienceMode } from '@/types';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDollarSign, Languages, LayoutDashboard, ListChecks, Sparkles, WalletCards } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { ONBOARDING_COPY, ONBOARDING_STEPS } from './onboarding-copy';

const CURRENCY_OPTIONS = [
  { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

type StarterDataMode = 'starter' | 'blank';

type OnboardingClientProps = {
  initialCurrency: string;
  initialLocale: AppLocale;
  initialExperienceMode: UserExperienceMode;
  nextPath: string;
};

function OptionCard({ active, icon, title, description, onClick }: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-full min-h-28 w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all',
        active
          ? 'border-indigo-300 bg-indigo-50 text-slate-950 shadow-lg shadow-indigo-500/10 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-slate-100'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/70'
      )}
    >
      <span className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
        active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      )}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-base font-bold">
          {title}
          {active && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />}
        </span>
        <span className="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </button>
  );
}

function StepMarker({ active, done, number, label }: { active: boolean; done: boolean; number: number; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors',
        done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      )}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : number}
      </span>
      <span className={cn('hidden min-w-0 truncate text-sm font-bold sm:block', active ? 'text-slate-950 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400')}>
        {label}
      </span>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/50">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

export default function OnboardingClient({ initialCurrency, initialLocale, initialExperienceMode, nextPath }: OnboardingClientProps) {
  const router = useRouter();
  const { update } = useSession();
  const [preferredLocale, setPreferredLocale] = useState<AppLocale>(initialLocale);
  const [currency, setCurrency] = useState(initialCurrency || 'BDT');
  const [experienceMode, setExperienceMode] = useState<UserExperienceMode>(initialExperienceMode || 'FULL');
  const [starterData, setStarterData] = useState<StarterDataMode>('starter');
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const copy = ONBOARDING_COPY[preferredLocale];
  const currentStep = ONBOARDING_STEPS[stepIndex];
  const currentStepCopy = copy.steps[currentStep];
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  const languageLabel = LOCALE_OPTIONS.find((locale) => locale.value === preferredLocale)?.nativeLabel || preferredLocale;

  const handleSubmit = () => {
    setError('');
    const formData = new FormData();
    formData.set('preferredLocale', preferredLocale);
    formData.set('currency', currency);
    formData.set('experienceMode', experienceMode);
    formData.set('starterData', starterData);

    startTransition(async () => {
      const result = await completeOnboardingAction(formData);
      if (!result.success || !result.data) {
        setError(result.message);
        return;
      }

      await update({
        preferredLocale: result.data.preferredLocale,
        currency: result.data.currency,
        experienceMode: result.data.experienceMode,
        onboardingCompletedAt: result.data.onboardingCompletedAt,
      });
      router.replace(nextPath);
      router.refresh();
    });
  };

  const goNext = () => {
    setError('');
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }
    handleSubmit();
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <AppLogo tagline="Personal Finance Manager" />
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 sm:text-sm">
            {copy.badge}
          </span>
        </header>

        <section className="grid flex-1 gap-8 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-sm font-bold text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" />
              {copy.eyebrow}
            </div>
            <div>
              <h1 className="text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">{copy.subtitle}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-sm font-black text-slate-950 dark:text-slate-100">{copy.summaryTitle}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SummaryItem label={copy.summary.language} value={languageLabel} />
                <SummaryItem label={copy.summary.currency} value={currency} />
                <SummaryItem label={copy.summary.experience} value={experienceMode} />
                <SummaryItem label={copy.summary.starter} value={copy.starterOptions[starterData].summary} />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                {ONBOARDING_STEPS.map((step, index) => (
                  <StepMarker key={step} active={index === stepIndex} done={index < stepIndex} number={index + 1} label={copy.steps[step].label} />
                ))}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{copy.step} {stepIndex + 1} / {ONBOARDING_STEPS.length}</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-100">{currentStepCopy.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{currentStepCopy.description}</p>
              </div>

              {currentStep === 'language' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {LOCALE_OPTIONS.map((locale) => (
                    <OptionCard key={locale.value} active={preferredLocale === locale.value} icon={<Languages className="h-5 w-5" />} title={locale.nativeLabel} description={locale.label} onClick={() => setPreferredLocale(locale.value)} />
                  ))}
                </div>
              )}

              {currentStep === 'currency' && (
                <div className="space-y-4">
                  <div className="flex h-16 items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <CircleDollarSign className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-slate-100">{currency}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{currentStepCopy.hint}</p>
                    </div>
                  </div>
                  <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                    {CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              )}

              {currentStep === 'experience' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionCard active={experienceMode === 'BASIC'} icon={<WalletCards className="h-5 w-5" />} title="Basic" description={copy.experienceOptions.BASIC} onClick={() => setExperienceMode('BASIC')} />
                  <OptionCard active={experienceMode === 'FULL'} icon={<Sparkles className="h-5 w-5" />} title="Full" description={copy.experienceOptions.FULL} onClick={() => setExperienceMode('FULL')} />
                </div>
              )}

              {currentStep === 'starter' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionCard active={starterData === 'starter'} icon={<ListChecks className="h-5 w-5" />} title={copy.starterOptions.starter.title} description={copy.starterOptions.starter.description} onClick={() => setStarterData('starter')} />
                  <OptionCard active={starterData === 'blank'} icon={<LayoutDashboard className="h-5 w-5" />} title={copy.starterOptions.blank.title} description={copy.starterOptions.blank.description} onClick={() => setStarterData('blank')} />
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                {currentStepCopy.hint}
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.changeLater}</p>
                <div className="flex shrink-0 gap-2">
                  {stepIndex > 0 && (
                    <Button type="button" variant="outline" size="lg" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={isPending}>
                      <ArrowLeft className="h-4 w-4" />
                      {copy.back}
                    </Button>
                  )}
                  <Button type="button" size="lg" onClick={goNext} isLoading={isPending}>
                    {isPending ? copy.saving : stepIndex === ONBOARDING_STEPS.length - 1 ? copy.finish : copy.continue}
                    {!isPending && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
