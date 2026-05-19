'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Banknote,
  CircleDollarSign,
  CreditCard,
  Globe2,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AdminAnalyticsResult } from '@/actions/admin.actions';
import { APP_NAME } from '@/components/brand/AppLogo';
import { useI18n } from '@/i18n/client';

const metricIcons = [Users, ShieldCheck, CreditCard, TrendingUp, AlertTriangle, Activity, Globe2];

const toneClasses = {
  indigo: 'text-indigo-500 bg-indigo-500/10',
  emerald: 'text-emerald-500 bg-emerald-500/10',
  amber: 'text-amber-500 bg-amber-500/10',
  rose: 'text-rose-500 bg-rose-500/10',
  sky: 'text-sky-500 bg-sky-500/10',
  violet: 'text-violet-500 bg-violet-500/10',
};

const packageColors = ['#2563eb', '#10b981', '#f59e0b', '#e11d48', '#7c3aed', '#0891b2'];

type AdminAnalyticsClientProps = {
  analytics: AdminAnalyticsResult;
};

function numberLabel(value: number, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function sourceLabel(source: string) {
  return source === 'ADMIN_GRANT' ? 'Admin grant' : 'Self service';
}

export default function AdminAnalyticsClient({ analytics }: AdminAnalyticsClientProps) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.admin.analytics;
  const common = messages.pages.admin.common;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState(analytics.generatedAt);
  const packageChartData = analytics.packageMix.filter((pkg) => pkg.subscriptions > 0);
  const accessRows = [
    { label: copy.labels.active, value: analytics.access.activeSubscriptions, color: 'bg-emerald-500' },
    { label: copy.labels.trialing, value: analytics.access.trialingSubscriptions, color: 'bg-sky-500' },
    { label: copy.labels.pastDue, value: analytics.access.pastDueSubscriptions, color: 'bg-amber-500' },
    { label: copy.labels.canceled, value: analytics.access.canceledSubscriptions, color: 'bg-rose-500' },
    { label: copy.labels.noAccess, value: analytics.access.withoutAccess, color: 'bg-slate-400' },
  ];
  const accessTotal = Math.max(accessRows.reduce((sum, row) => sum + row.value, 0), 1);
  const siteVisitCards = [
    { label: copy.labels.viewsToday, value: analytics.siteVisits.viewsToday, helper: `${numberLabel(analytics.siteVisits.uniqueVisitorsToday, locale)} ${copy.labels.uniqueVisitors}` },
    { label: copy.labels.views30, value: analytics.siteVisits.viewsLast30Days, helper: `${numberLabel(analytics.siteVisits.uniqueVisitorsLast30Days, locale)} ${copy.labels.uniqueVisitors}` },
    { label: copy.labels.loggedInViews, value: analytics.siteVisits.loggedInViewsLast30Days, helper: copy.labels.last30Days },
    { label: copy.labels.anonymousViews, value: analytics.siteVisits.anonymousViewsLast30Days, helper: copy.labels.last30Days },
  ];
  const liveActivityCards = [
    { label: copy.labels.onlineNow, value: analytics.liveActivity.onlineUsersNow, helper: copy.noActiveUsers },
    { label: copy.labels.activeSessions, value: analytics.liveActivity.activeSessionsNow, helper: 'Heartbeat sessions' },
    { label: copy.labels.activeToday, value: analytics.liveActivity.activeUsersToday, helper: copy.labels.activeToday },
    { label: copy.labels.activeThisWeek, value: analytics.liveActivity.activeUsersThisWeek, helper: copy.labels.activeThisWeek },
  ];
  const metricLabel = (label: string) => {
    const labels: Record<string, string> = {
      'Total Users': messages.pages.admin.users.totalUsers,
      'Active Users': messages.pages.admin.users.activeAccounts,
      'Active Access': messages.pages.admin.subscriptions.activeAccess,
      'Growth Delta': 'গ্রোথ ডেল্টা',
      'Churn Risk': 'চর্ন ঝুঁকি',
      '30-Day Transactions': '৩০ দিনের লেনদেন',
      '30-Day Visits': copy.labels.views30,
      'Online Now': copy.labels.onlineNow,
    };
    return locale === 'bn-BD' ? labels[label] || label : label;
  };

  const refreshAnalytics = () => {
    startTransition(() => {
      setLastRefresh(new Date().toISOString());
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {copy.subtitle.replace('{appName}', APP_NAME)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{copy.updated} {formatDate(analytics.generatedAt, 'MMM d, h:mm a')}</Badge>
          <Button variant="outline" size="sm" onClick={refreshAnalytics} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {common.refresh}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {analytics.metrics.map((metric, index) => {
          const Icon = metricIcons[index] || Activity;
          return (
            <Card key={metric.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{metricLabel(metric.label)}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-200">{numberLabel(metric.value, locale)}</p>
                </div>
                <span className={`rounded-xl p-2 ${toneClasses[metric.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{metric.helper}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.growthTrend}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.growthTrendHelp}</p>
            </div>
            <UserPlus className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.trends}>
                <defs>
                  <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="transactionsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="users" name={messages.pages.admin.users.users} stroke="#2563eb" fill="url(#usersFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="subscriptions" name={messages.pages.admin.subscriptions.subscriptions} stroke="#7c3aed" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="transactions" name={messages.navigation.Transactions} stroke="#10b981" fill="url(#transactionsFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="visits" name={copy.siteVisits} stroke="#f59e0b" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.accessHealth}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.accessHealthHelp}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-4">
            {accessRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{row.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/50">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max((row.value / accessTotal) * 100, row.value > 0 ? 4 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.liveActivity}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.liveActivityHelp}</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              <button
                type="button"
                onClick={refreshAnalytics}
                disabled={isPending}
                aria-label={copy.refreshLive}
                title={copy.refreshLive}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {liveActivityCards.map((card) => (
              <div key={card.label} className="rounded-xl bg-slate-100/70 p-4 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-200">{numberLabel(card.value, locale)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.helper}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{copy.lastRefresh} {formatDate(lastRefresh, 'MMM d, h:mm a')}.</p>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.activeRoutes}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.activeRoutesHelp}</p>
            </div>
            <Globe2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-3">
            {analytics.liveActivity.activeRoutes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noActiveUsers}</p>
            ) : analytics.liveActivity.activeRoutes.map((route) => {
              const maxViews = Math.max(...analytics.liveActivity.activeRoutes.map((item) => item.views), 1);
              return (
                <div key={route.path}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{route.path}</span>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-200">{route.views}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/50">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max((route.views / maxViews) * 100, 5)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.currentlyActiveUsers}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.currentlyActiveUsersHelp}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-100/70 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">{common.user}</th>
                <th className="px-5 py-3 font-semibold">{copy.currentRoute}</th>
                <th className="px-5 py-3 font-semibold">{copy.device}</th>
                <th className="px-5 py-3 font-semibold">{copy.lastSeen}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {analytics.liveActivity.recentActiveUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500 dark:text-slate-400">{copy.noActiveUsers}</td>
                </tr>
              ) : analytics.liveActivity.recentActiveUsers.map((user) => (
                <tr key={user.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900 dark:text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-200">{user.currentPath}</td>
                  <td className="px-5 py-3">
                    <p>{user.deviceType || common.unknown}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.browser || common.unknown}</p>
                  </td>
                  <td className="px-5 py-3">{formatDate(user.lastSeenAt, 'MMM d, h:mm a')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.siteVisits}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.siteVisitsHelp}</p>
            </div>
            <MousePointerClick className="h-5 w-5 text-violet-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {siteVisitCards.map((card) => (
              <div key={card.label} className="rounded-xl bg-slate-100/70 p-4 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-200">{numberLabel(card.value, locale)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.helper}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-100/70 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.allTimeViews}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-200">{numberLabel(analytics.siteVisits.totalViews, locale)}</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.topRoutes}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.topRoutesHelp}</p>
            </div>
            <Globe2 className="h-5 w-5 text-sky-500" />
          </div>
          <div className="space-y-3">
            {analytics.siteVisits.topRoutes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noPageViews}</p>
            ) : analytics.siteVisits.topRoutes.map((route) => {
              const maxViews = Math.max(...analytics.siteVisits.topRoutes.map((item) => item.views), 1);
              return (
                <div key={route.path}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{route.path}</span>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-slate-200">{route.views}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/50">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max((route.views / maxViews) * 100, 5)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.deviceMix}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.deviceMixHelp}</p>
          </div>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.siteVisits.deviceBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.browserMix}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.browserMixHelp}</p>
          </div>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.siteVisits.browserBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0891b2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.recentPageViews}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.recentPageViewsHelp}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100/70 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">{copy.route}</th>
                <th className="px-5 py-3 font-semibold">{copy.visitor}</th>
                <th className="px-5 py-3 font-semibold">{copy.device}</th>
                <th className="px-5 py-3 font-semibold">{copy.referrer}</th>
                <th className="px-5 py-3 font-semibold">{copy.time}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {analytics.siteVisits.recentViews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-500 dark:text-slate-400">{copy.noPageViews}</td>
                </tr>
              ) : analytics.siteVisits.recentViews.map((view) => (
                <tr key={view.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-200">{view.path}</td>
                  <td className="px-5 py-3">
                    {view.user ? (
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-200">{view.user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{view.user.email}</p>
                      </div>
                    ) : (
                      <Badge variant="default">{copy.anonymous}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <p>{view.deviceType || common.unknown}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{view.browser || common.unknown}</p>
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-3 text-slate-500 dark:text-slate-400">{view.referrer || copy.direct}</td>
                  <td className="px-5 py-3">{formatDate(view.createdAt, 'MMM d, h:mm a')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.packageMix}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.packageMixHelp}</p>
            </div>
            <BadgeDollarSign className="h-5 w-5 text-sky-500" />
          </div>
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={packageChartData} dataKey="subscriptions" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {packageChartData.map((entry, index) => (
                      <Cell key={entry.id} fill={packageColors[index % packageColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {analytics.packageMix.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{copy.noPackages}</p>
              ) : analytics.packageMix.map((pkg, index) => (
                <div key={pkg.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: packageColors[index % packageColors.length] }} />
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">{pkg.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {pkg.subscriptions} {copy.subscriptions} · {formatCurrency(pkg.price, pkg.currency)} {pkg.interval === 'MONTHLY' ? common.monthly : common.yearly}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-200">
                    {formatCurrency(pkg.monthlyValue, pkg.currency)}/mo
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.estimatedValue}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.estimatedValueHelp}</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.monthlyRecurringValue}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-200">
                {formatCurrency(analytics.estimatedRevenue.monthlyRecurringValue, analytics.estimatedRevenue.currency)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{copy.annualized}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-200">
                {formatCurrency(analytics.estimatedRevenue.annualRecurringValue, analytics.estimatedRevenue.currency)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">{copy.selfService}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-200">{analytics.access.selfService}</p>
              </div>
              <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">{copy.adminGrants}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-200">{analytics.access.adminGranted}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.financeActivity}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{copy.financeActivityHelp}</p>
            </div>
            <Banknote className="h-5 w-5 text-amber-500" />
          </div>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { label: copy.labels.income, value: analytics.finance.last30DaysIncome, fill: '#10b981' },
                { label: copy.labels.expense, value: analytics.finance.last30DaysExpense, fill: '#e11d48' },
                { label: copy.labels.balance, value: analytics.finance.totalAccountBalance, fill: '#2563eb' },
                { label: copy.labels.invested, value: analytics.finance.totalInvestedValue, fill: '#f59e0b' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), analytics.estimatedRevenue.currency)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {['#10b981', '#e11d48', '#2563eb', '#f59e0b'].map((color) => (
                    <Cell key={color} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 p-5 dark:border-slate-700/50">
            <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.recentSignups}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.recentSignupsHelp}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-100/70 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">{common.user}</th>
                  <th className="px-5 py-3 font-semibold">{common.role}</th>
                  <th className="px-5 py-3 font-semibold">{copy.access}</th>
                  <th className="px-5 py-3 font-semibold">{copy.joined}</th>
                  <th className="px-5 py-3 font-semibold">{copy.lastLogin}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {analytics.recentUsers.map((user) => (
                  <tr key={user.id} className="text-slate-700 dark:text-slate-300">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-200">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>{user.role}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {user.subscription ? (
                        <div>
                          <Badge variant={user.subscription.status === 'ACTIVE' ? 'success' : 'warning'}>{user.subscription.status === 'ACTIVE' ? common.active : user.subscription.status}</Badge>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {user.subscription.packageName || sourceLabel(user.subscription.source)}
                          </p>
                        </div>
                      ) : (
                        <Badge variant={user.role === 'ADMIN' ? 'success' : 'danger'}>{user.role === 'ADMIN' ? common.admin : common.noAccess}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">{formatDate(user.createdAt, 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3">{user.lastLoginAt ? formatDate(user.lastLoginAt, 'MMM d, yyyy') : common.never}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
