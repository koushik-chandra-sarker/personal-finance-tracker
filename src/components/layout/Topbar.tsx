 'use client';

import { useSession, signOut } from 'next-auth/react';
import { AlertTriangle, Bell, CheckCircle2, FileText, Info, LogOut, Menu, Search, Tags, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useState, useRef, useEffect } from 'react';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getNotificationsAction,
  getUnreadNotificationCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/actions/notification.actions';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Target,
  RefreshCw, FileBarChart, Settings, X, DollarSign, CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  severity: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function Topbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    const [items, count] = await Promise.all([
      getNotificationsAction({ limit: 10 }),
      getUnreadNotificationCountAction(),
    ]);
    setNotifications(items as NotificationItem[]);
    setUnreadCount(count);
  };

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user menu on pathname change
  useEffect(() => {
    queueMicrotask(() => {
      setUserMenuOpen(false);
      setNotificationOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    Promise.all([
      getNotificationsAction({ limit: 10 }),
      getUnreadNotificationCountAction(),
    ]).then(([items, count]) => {
      if (cancelled) return;
      setNotifications(items as NotificationItem[]);
      setUnreadCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    await fetchNotifications();
  };

  const handleNotificationClick = async (id: string) => {
    await markNotificationReadAction(id);
    await fetchNotifications();
    setNotificationOpen(false);
  };

  const severityStyle: Record<string, string> = {
    INFO: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10',
    WARNING: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    CRITICAL: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10',
    SUCCESS: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  };

  const SeverityIcon = ({ severity }: { severity: string }) => {
    if (severity === 'SUCCESS') return <CheckCircle2 className="h-4 w-4" />;
    if (severity === 'WARNING' || severity === 'CRITICAL') return <AlertTriangle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">FinTrack</span>
          </div>

          {/* Search (desktop) */}
          <div className="hidden lg:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <WorkspaceSwitcher />
            <ThemeToggle />
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-[min(calc(100vw-2rem),24rem)] rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                    <button
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 disabled:text-slate-400 dark:disabled:text-slate-600"
                    >
                      Mark all read
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => {
                        const content = (
                          <div className={cn(
                            'flex gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors',
                            !notification.isRead && 'bg-indigo-50/50 dark:bg-indigo-500/10'
                          )}>
                            <div className={cn('mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', severityStyle[notification.severity] || severityStyle.INFO)}>
                              <SeverityIcon severity={notification.severity} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{notification.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{notification.message}</p>
                              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{formatRelativeDate(notification.createdAt)}</p>
                            </div>
                            {!notification.isRead && <span className="mt-2 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                          </div>
                        );

                        return notification.actionUrl ? (
                          <Link key={notification.id} href={notification.actionUrl} onClick={() => handleNotificationClick(notification.id)}>
                            {content}
                          </Link>
                        ) : (
                          <button key={notification.id} onClick={() => handleNotificationClick(notification.id)} className="block w-full">
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden md:block text-sm text-slate-900 dark:text-white truncate max-w-[170px]">{session?.user?.name}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">FinTrack</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-white border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
