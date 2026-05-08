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

function numberLabel(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function sourceLabel(source: string) {
  return source === 'ADMIN_GRANT' ? 'Admin grant' : 'Self service';
}

export default function AdminAnalyticsClient({ analytics }: AdminAnalyticsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState(analytics.generatedAt);
  const packageChartData = analytics.packageMix.filter((pkg) => pkg.subscriptions > 0);
  const accessRows = [
    { label: 'Active', value: analytics.access.activeSubscriptions, color: 'bg-emerald-500' },
    { label: 'Trialing', value: analytics.access.trialingSubscriptions, color: 'bg-sky-500' },
    { label: 'Past due', value: analytics.access.pastDueSubscriptions, color: 'bg-amber-500' },
    { label: 'Canceled', value: analytics.access.canceledSubscriptions, color: 'bg-rose-500' },
    { label: 'No access', value: analytics.access.withoutAccess, color: 'bg-slate-400' },
  ];
  const accessTotal = Math.max(accessRows.reduce((sum, row) => sum + row.value, 0), 1);
  const siteVisitCards = [
    { label: 'Views Today', value: analytics.siteVisits.viewsToday, helper: `${analytics.siteVisits.uniqueVisitorsToday} unique visitors` },
    { label: '30-Day Views', value: analytics.siteVisits.viewsLast30Days, helper: `${analytics.siteVisits.uniqueVisitorsLast30Days} unique visitors` },
    { label: 'Logged-In Views', value: analytics.siteVisits.loggedInViewsLast30Days, helper: 'Last 30 days' },
    { label: 'Anonymous Views', value: analytics.siteVisits.anonymousViewsLast30Days, helper: 'Last 30 days' },
  ];
  const liveActivityCards = [
    { label: 'Online Now', value: analytics.liveActivity.onlineUsersNow, helper: 'Unique users in the last 5 minutes' },
    { label: 'Active Sessions', value: analytics.liveActivity.activeSessionsNow, helper: 'Open sessions sending heartbeat' },
    { label: 'Active Today', value: analytics.liveActivity.activeUsersToday, helper: 'Unique users seen today' },
    { label: 'Active This Week', value: analytics.liveActivity.activeUsersThisWeek, helper: 'Unique users seen in 7 days' },
  ];

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Platform health, access status, subscription value, and finance activity across {APP_NAME}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Updated {formatDate(analytics.generatedAt, 'MMM d, h:mm a')}</Badge>
          <Button variant="outline" size="sm" onClick={refreshAnalytics} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{numberLabel(metric.value)}</p>
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
              <h2 className="font-semibold text-slate-900 dark:text-white">Growth Trend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">New users, subscriptions, and transaction activity.</p>
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
                <Area type="monotone" dataKey="users" name="Users" stroke="#2563eb" fill="url(#usersFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="subscriptions" name="Subscriptions" stroke="#7c3aed" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="transactions" name="Transactions" stroke="#10b981" fill="url(#transactionsFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="visits" name="Visits" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Access Health</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Current subscription and access state.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-4">
            {accessRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{row.value}</span>
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
              <h2 className="font-semibold text-slate-900 dark:text-white">Live Activity</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Currently active users are based on recent heartbeat data.</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              <button
                type="button"
                onClick={refreshAnalytics}
                disabled={isPending}
                aria-label="Refresh live activity"
                title="Refresh live activity"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {liveActivityCards.map((card) => (
              <div key={card.label} className="rounded-xl bg-slate-100/70 p-4 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{numberLabel(card.value)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.helper}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Last refresh requested {formatDate(lastRefresh, 'MMM d, h:mm a')}.</p>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Active Routes</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Where online users are currently browsing.</p>
            </div>
            <Globe2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-3">
            {analytics.liveActivity.activeRoutes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No active users in the last 5 minutes.</p>
            ) : analytics.liveActivity.activeRoutes.map((route) => {
              const maxViews = Math.max(...analytics.liveActivity.activeRoutes.map((item) => item.views), 1);
              return (
                <div key={route.path}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{route.path}</span>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-white">{route.views}</span>
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
          <h2 className="font-semibold text-slate-900 dark:text-white">Currently Active Users</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Users seen in the last 5 minutes, grouped by browser session.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-100/70 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Current Route</th>
                <th className="px-5 py-3 font-semibold">Device</th>
                <th className="px-5 py-3 font-semibold">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {analytics.liveActivity.recentActiveUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500 dark:text-slate-400">No active users in the last 5 minutes.</td>
                </tr>
              ) : analytics.liveActivity.recentActiveUsers.map((user) => (
                <tr key={user.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{user.currentPath}</td>
                  <td className="px-5 py-3">
                    <p>{user.deviceType || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.browser || 'Unknown browser'}</p>
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
              <h2 className="font-semibold text-slate-900 dark:text-white">Site Visits</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Route visits captured across public and authenticated pages.</p>
            </div>
            <MousePointerClick className="h-5 w-5 text-violet-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {siteVisitCards.map((card) => (
              <div key={card.label} className="rounded-xl bg-slate-100/70 p-4 dark:bg-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{numberLabel(card.value)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.helper}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-100/70 p-4 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">All-time tracked page views</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{numberLabel(analytics.siteVisits.totalViews)}</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Top Routes</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Most visited routes in the last 30 days.</p>
            </div>
            <Globe2 className="h-5 w-5 text-sky-500" />
          </div>
          <div className="space-y-3">
            {analytics.siteVisits.topRoutes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No page views tracked yet.</p>
            ) : analytics.siteVisits.topRoutes.map((route) => {
              const maxViews = Math.max(...analytics.siteVisits.topRoutes.map((item) => item.views), 1);
              return (
                <div key={route.path}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{route.path}</span>
                    <span className="shrink-0 font-semibold text-slate-900 dark:text-white">{route.views}</span>
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
            <h2 className="font-semibold text-slate-900 dark:text-white">Device Mix</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Visitor device types in the last 30 days.</p>
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
            <h2 className="font-semibold text-slate-900 dark:text-white">Browser Mix</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Detected browsers in the last 30 days.</p>
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
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Page Views</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Latest tracked site visits with user and device context.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100/70 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Route</th>
                <th className="px-5 py-3 font-semibold">Visitor</th>
                <th className="px-5 py-3 font-semibold">Device</th>
                <th className="px-5 py-3 font-semibold">Referrer</th>
                <th className="px-5 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {analytics.siteVisits.recentViews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-slate-500 dark:text-slate-400">No page views tracked yet.</td>
                </tr>
              ) : analytics.siteVisits.recentViews.map((view) => (
                <tr key={view.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{view.path}</td>
                  <td className="px-5 py-3">
                    {view.user ? (
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{view.user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{view.user.email}</p>
                      </div>
                    ) : (
                      <Badge variant="default">Anonymous</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <p>{view.deviceType || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{view.browser || 'Unknown browser'}</p>
                  </td>
                  <td className="max-w-[220px] truncate px-5 py-3 text-slate-500 dark:text-slate-400">{view.referrer || 'Direct'}</td>
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
              <h2 className="font-semibold text-slate-900 dark:text-white">Package Mix</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active package distribution and estimated monthly value.</p>
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
                <p className="text-sm text-slate-500 dark:text-slate-400">No packages configured yet.</p>
              ) : analytics.packageMix.map((pkg, index) => (
                <div key={pkg.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: packageColors[index % packageColors.length] }} />
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{pkg.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {pkg.subscriptions} subscriptions · {formatCurrency(pkg.price, pkg.currency)} {pkg.interval.toLowerCase()}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
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
              <h2 className="font-semibold text-slate-900 dark:text-white">Estimated Value</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Package value, not payment-settled revenue.</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monthly recurring value</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(analytics.estimatedRevenue.monthlyRecurringValue, analytics.estimatedRevenue.currency)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Annualized</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                {formatCurrency(analytics.estimatedRevenue.annualRecurringValue, analytics.estimatedRevenue.currency)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Self service</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{analytics.access.selfService}</p>
              </div>
              <div className="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Admin grants</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{analytics.access.adminGranted}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Finance Activity</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">App-wide money movement and portfolio footprint.</p>
            </div>
            <Banknote className="h-5 w-5 text-amber-500" />
          </div>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { label: 'Income', value: analytics.finance.last30DaysIncome, fill: '#10b981' },
                { label: 'Expense', value: analytics.finance.last30DaysExpense, fill: '#e11d48' },
                { label: 'Balance', value: analytics.finance.totalAccountBalance, fill: '#2563eb' },
                { label: 'Invested', value: analytics.finance.totalInvestedValue, fill: '#f59e0b' },
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
            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Signups</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Newest accounts and their current access source.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-100/70 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Access</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {analytics.recentUsers.map((user) => (
                  <tr key={user.id} className="text-slate-700 dark:text-slate-300">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>{user.role}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {user.subscription ? (
                        <div>
                          <Badge variant={user.subscription.status === 'ACTIVE' ? 'success' : 'warning'}>{user.subscription.status}</Badge>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {user.subscription.packageName || sourceLabel(user.subscription.source)}
                          </p>
                        </div>
                      ) : (
                        <Badge variant={user.role === 'ADMIN' ? 'success' : 'danger'}>{user.role === 'ADMIN' ? 'Admin' : 'No access'}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">{formatDate(user.createdAt, 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3">{user.lastLoginAt ? formatDate(user.lastLoginAt, 'MMM d, yyyy') : 'Never'}</td>
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
