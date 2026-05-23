'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { getSubscriptionLockedHref, hasActiveSubscriptionAccess, type SubscriptionAccessUser } from '@/lib/subscription-access';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Target, Tags,
  RefreshCw, FileBarChart, Settings, ChevronLeft, ChevronRight, ChevronDown, FileText, CreditCard,
  Users, KeyRound, TrendingUp, BarChart3, PlayCircle, MessageSquare, LifeBuoy, ReceiptText, Calculator, BookOpen,
} from 'lucide-react';
import { type ElementType, useState } from 'react';
import AppLogo from '@/components/brand/AppLogo';
import { useI18n } from '@/i18n/client';
import { isVisibleForExperienceMode } from '@/lib/experience-mode';

type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
};

const primaryNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
];

const investmentNavItems: NavItem[] = [
  { href: '/investments', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/investments/portfolio', label: 'Portfolio', icon: Wallet },
  { href: '/investments/types', label: 'Types', icon: Settings },
];

const secondaryNavItems: NavItem[] = [
  { href: '/salary-planner', label: 'Salary Planner', icon: Calculator },
  { href: '/tax-calculator', label: 'Tax Calculator', icon: ReceiptText },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/service-tracker', label: 'Subscription Tracker', icon: CreditCard },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/tutorials', label: 'Tutorials', icon: PlayCircle },
  { href: '/guide', label: 'User Guide', icon: BookOpen },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminNavItems: NavItem[] = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: KeyRound },
  { href: '/admin/payments', label: 'Payments', icon: ReceiptText },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/investments', label: 'Investment Config', icon: TrendingUp },
  { href: '/admin/tutorials', label: 'Academy Management', icon: PlayCircle },
  { href: '/admin/tax-config', label: 'Tax Config', icon: Calculator },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

function isActiveInvestmentRoute(pathname: string, href: string) {
  if (href === '/investments') return pathname === href;
  return isActiveRoute(pathname, href);
}

type SidebarProps = {
  subscriptionAccessUser?: SubscriptionAccessUser | null;
};

export default function Sidebar({ subscriptionAccessUser }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { messages } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [investmentsOpen, setInvestmentsOpen] = useState(() => pathname.startsWith('/investments'));
  const [adminOpen, setAdminOpen] = useState(() => pathname.startsWith('/admin'));
  const currentUser = subscriptionAccessUser || session?.user;
  const isAdmin = currentUser?.role === 'ADMIN';
  const isSubscriptionLocked = Boolean(currentUser) && !hasActiveSubscriptionAccess(currentUser);
  const isInvestmentsRoute = pathname.startsWith('/investments');
  const isAdminRoute = pathname.startsWith('/admin');
  const experienceMode = currentUser?.experienceMode;
  const visiblePrimaryNavItems = primaryNavItems.filter((item) => isVisibleForExperienceMode(item.href, experienceMode));
  const visibleInvestmentNavItems = investmentNavItems.filter((item) => isVisibleForExperienceMode(item.href, experienceMode));
  const visibleSecondaryNavItems = secondaryNavItems.filter((item) => isVisibleForExperienceMode(item.href, experienceMode));
  const showInvestments = visibleInvestmentNavItems.length > 0;
  const navHref = (href: string) => getSubscriptionLockedHref(href, isSubscriptionLocked ? currentUser : null);
  const navLabel = (label: string) => messages.navigation[label as keyof typeof messages.navigation] || label;
  const renderNavLink = (item: NavItem) => {
    const isActive = isActiveRoute(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={navHref(item.href)}
        prefetch={!isSubscriptionLocked}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-slate-200 border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
        )}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-indigo-600 dark:text-indigo-400' : '')} />
        {!collapsed && <span>{navLabel(item.label)}</span>}
      </Link>
    );
  };

  return (
    <aside className={cn(
      'hidden lg:flex flex-col h-screen sticky top-0 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300',
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-700/50">
        <AppLogo showText={!collapsed} tagline={messages.brand.tagline} />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {visiblePrimaryNavItems.map(renderNavLink)}

        {showInvestments && (
        <div>
          <button
            type="button"
            onClick={() => setInvestmentsOpen(!investmentsOpen)}
            title={collapsed ? messages.navigation.Investments : undefined}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              isInvestmentsRoute
                ? 'text-indigo-700 dark:text-slate-200 bg-indigo-500/10 dark:bg-indigo-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
            )}
            aria-expanded={investmentsOpen}
          >
            <TrendingUp className={cn('h-5 w-5 flex-shrink-0', isInvestmentsRoute ? 'text-indigo-600 dark:text-indigo-400' : '')} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{messages.navigation.Investments}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', investmentsOpen && 'rotate-180')} />
              </>
            )}
          </button>

          {investmentsOpen && (
            <div className={cn('mt-1 space-y-1', collapsed ? '' : 'pl-4')}>
              {visibleInvestmentNavItems.map((item) => {
                const isActive = isActiveInvestmentRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={navHref(item.href)}
                    prefetch={!isSubscriptionLocked}
                    title={collapsed ? navLabel(item.label) : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-slate-200 border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-indigo-600 dark:text-indigo-400' : '')} />
                    {!collapsed && <span>{navLabel(item.label)}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        )}

        {visibleSecondaryNavItems.map(renderNavLink)}

        {isAdmin && (
          <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setAdminOpen(!adminOpen)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isAdminRoute
                  ? 'text-indigo-700 dark:text-slate-200 bg-indigo-500/10 dark:bg-indigo-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
              )}
              aria-expanded={adminOpen}
            >
              <KeyRound className={cn('h-5 w-5 flex-shrink-0', isAdminRoute ? 'text-indigo-600 dark:text-indigo-400' : '')} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{messages.navigation.Admin}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', adminOpen && 'rotate-180')} />
                </>
              )}
            </button>

            {adminOpen && (
              <div className={cn('mt-1 space-y-1', collapsed ? '' : 'pl-4')}>
                {adminNavItems.map((item) => {
                  const isActive = isActiveRoute(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={navHref(item.href)}
                      prefetch={!isSubscriptionLocked}
                      title={collapsed ? navLabel(item.label) : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-slate-200 border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-indigo-600 dark:text-indigo-400' : '')} />
                      {!collapsed && <span>{navLabel(item.label)}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
