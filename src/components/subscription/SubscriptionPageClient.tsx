'use client';

import Link from 'next/link';
import { Check, CheckCircle2, CreditCard, ReceiptText, ShieldAlert, Smartphone } from 'lucide-react';
import Card from '@/components/ui/Card';
import ContinuePaymentButton from '@/components/subscription/ContinuePaymentButton';
import type { SubscriptionPackageRow } from '@/actions/settings.actions';
import { formatCurrency } from '@/lib/utils';
import { APP_NAME } from '@/components/brand/AppLogo';

const MESSAGE_BY_REASON: Record<string, string> = {
  missing: `A subscription is required to continue using ${APP_NAME}.`,
  inactive: 'Your subscription is not active. Choose a package and submit your payment details to restore access.',
  expired: 'Your subscription has expired. Choose a package and submit your payment details to continue.',
  invalid: 'Your subscription could not be verified. Choose a package and submit a new payment request.',
};

interface SubscriptionPageClientProps {
  reason: string;
  packages: SubscriptionPackageRow[];
  accessState?: 'blocked' | 'active' | 'pending';
}

export default function SubscriptionPageClient({ reason, packages, accessState = 'blocked' }: SubscriptionPageClientProps) {
  const reasonMessage = MESSAGE_BY_REASON[reason] || MESSAGE_BY_REASON.invalid;
  const featuredPackage = packages.find((pkg) => pkg.isFeatured) || packages[0] || null;

  if (accessState === 'active') {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col justify-center">
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/60 sm:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Subscription active</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Your access is already active</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            You do not need to submit another payment now. When the current period expires, this page will let you renew or upgrade.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Go to dashboard
            </Link>
            <Link href="/settings" className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              View subscription
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-6xl flex-col justify-center gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-stretch">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Choose package</p>
          <h1 className="max-w-2xl text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Select a subscription package
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{reasonMessage}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <CreditCard className="mb-3 h-5 w-5 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Pick package</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Choose monthly or yearly access in BDT.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <Smartphone className="mb-3 h-5 w-5 text-pink-500" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Pay manually</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Use bKash or Nagad and keep the TrxID.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <ReceiptText className="mb-3 h-5 w-5 text-sky-500" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Submit details</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Payment form and history live on a separate page.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Recommended</p>
          <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
            {featuredPackage ? formatCurrency(featuredPackage.price, featuredPackage.currency) : 'BDT'}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {featuredPackage ? `${featuredPackage.name} · ${featuredPackage.interval === 'YEARLY' ? 'yearly' : 'monthly'}` : 'Create a package to start collecting payments.'}
          </p>
          {featuredPackage && (
            <ContinuePaymentButton packageId={featuredPackage.id} icon="arrow" className="mt-6 w-full" />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((plan) => (
          <Card key={plan.id} className={plan.isFeatured ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : undefined}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h2>
                  {plan.discountLabel && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      {plan.discountLabel}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
              </div>
              <CreditCard className="h-5 w-5 shrink-0 text-emerald-500" />
            </div>
            <p className="mb-5 text-4xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(plan.price, plan.currency)}<span className="text-sm font-medium text-slate-500 dark:text-slate-400">{plan.interval === 'YEARLY' ? '/year' : '/month'}</span>
            </p>
            <div className="mb-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {plan.featureBullets.map((detail) => (
                <p key={detail} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {detail}
                </p>
              ))}
            </div>
            <ContinuePaymentButton packageId={plan.id} className="w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
