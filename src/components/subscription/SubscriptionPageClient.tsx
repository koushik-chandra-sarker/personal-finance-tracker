'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, BarChart3, Check, CreditCard, ShieldAlert, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { updateSubscriptionAction } from '@/actions/settings.actions';
import { formatCurrency } from '@/lib/utils';
import type { SubscriptionInterval } from '@/types';

const MESSAGE_BY_REASON: Record<string, string> = {
  missing: 'A subscription is required to continue using FinTrack.',
  inactive: 'Your subscription is not active. Choose a plan to restore access.',
  expired: 'Your subscription has expired. Choose a plan to continue.',
  invalid: 'Your subscription could not be verified. Choose a plan to continue.',
};

const MONTHLY_PRICE = 999;
const YEARLY_PRICE = 9990;
const YEARLY_SAVINGS = MONTHLY_PRICE * 12 - YEARLY_PRICE;

interface SubscriptionPageClientProps {
  reason: string;
  nextPath: string;
}

export default function SubscriptionPageClient({ reason, nextPath }: SubscriptionPageClientProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const subscribe = (interval: SubscriptionInterval) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateSubscriptionAction(interval);
      if (result.success && result.data) {
        await update(result.data);
        setMessage({ type: 'success', text: result.message });
        router.replace(nextPath);
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    });
  };

  const reasonMessage = MESSAGE_BY_REASON[reason] || MESSAGE_BY_REASON.invalid;
  const plans = [
    {
      interval: 'MONTHLY' as const,
      name: 'Pro Monthly',
      price: MONTHLY_PRICE,
      suffix: '/month',
      description: 'Flexible full access renewed monthly.',
      cta: 'Continue Monthly',
      featured: false,
      details: ['Full dashboard access', 'Collaborator workspaces', 'Cancel before next billing cycle'],
    },
    {
      interval: 'YEARLY' as const,
      name: 'Pro Yearly',
      price: YEARLY_PRICE,
      suffix: '/year',
      description: `Best value with ${formatCurrency(YEARLY_SAVINGS, 'BDT')} saved each year.`,
      cta: 'Continue Yearly',
      featured: true,
      details: ['Full dashboard access', 'Collaborator workspaces', 'Lower yearly price'],
    },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-6xl flex-col justify-center gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-stretch">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Access paused</p>
          <h1 className="max-w-2xl text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Subscribe to continue using FinTrack
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{reasonMessage}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <BarChart3 className="mb-3 h-5 w-5 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Finance workspace</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Dashboard, reports, budgets, goals, notes, and transactions.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <Users className="mb-3 h-5 w-5 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Collaborators</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Share your workspace and control feature access.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <CreditCard className="mb-3 h-5 w-5 text-sky-500" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">BDT billing</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Monthly or yearly access priced in Bangladeshi Taka.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Recommended</p>
          <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">{formatCurrency(YEARLY_PRICE, 'BDT')}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Yearly access saves {formatCurrency(YEARLY_SAVINGS, 'BDT')} compared with monthly billing.</p>
          <Button onClick={() => subscribe('YEARLY')} disabled={isPending} className="mt-6 w-full">
            Continue Yearly <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.interval} className={plan.featured ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/10' : undefined}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h2>
                  {plan.featured && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                      Best value
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
              </div>
              <CreditCard className="h-5 w-5 shrink-0 text-indigo-500" />
            </div>
            <p className="mb-5 text-4xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(plan.price, 'BDT')}<span className="text-sm font-medium text-slate-500 dark:text-slate-400">{plan.suffix}</span>
            </p>
            <div className="mb-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {plan.details.map((detail) => (
                <p key={detail} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" /> {detail}
                </p>
              ))}
            </div>
            <Button onClick={() => subscribe(plan.interval)} disabled={isPending} className="w-full">
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
