 'use client';

import { useSession, signOut } from 'next-auth/react';
import { AlertTriangle, Bell, BookOpen, CheckCircle2, FileText, Info, LogOut, Mail, Menu, Search, Tags, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { type ElementType, useState, useRef, useEffect, useCallback } from 'react';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getNotificationFeedAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/actions/notification.actions';
import { payDpsInstallmentAction } from '@/actions/investment.actions';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Target, CreditCard,
  RefreshCw, FileBarChart, Settings, X, ChevronDown, Users, KeyRound, TrendingUp, BarChart3, PlayCircle, MessageSquare, LifeBuoy, ReceiptText, Calculator,
  Loader2, Trash2, UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/utils';
import AppLogo from '@/components/brand/AppLogo';
import { getSubscriptionLockedHref, hasActiveSubscriptionAccess, type SubscriptionAccessUser } from '@/lib/subscription-access';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
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
  { href: '/admin/payments', label: 'Payments', icon: ReceiptText },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/contact-settings', label: 'Contact Settings', icon: Mail },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/investments', label: 'Investment Config', icon: TrendingUp },
  { href: '/admin/tutorials', label: 'Academy Management', icon: PlayCircle },
  { href: '/admin/tax-config', label: 'Tax Config', icon: Calculator },
];

const userAdminNavItems: NavItem[] = [
  { href: '/admin/users/accounts', label: 'User Accounts', icon: Users },
  { href: '/admin/users/invites', label: 'User Invites', icon: UserPlus },
  { href: '/admin/users/deleted', label: 'Deleted Users', icon: Trash2 },
];

const subscriptionAdminNavItems: NavItem[] = [
  { href: '/admin/subscriptions/packages', label: 'Package Setup', icon: KeyRound },
  { href: '/admin/subscriptions/access', label: 'User Access', icon: Users },
  { href: '/admin/subscriptions/payment-accounts', label: 'Payment Accounts', icon: CreditCard },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

function isActiveInvestmentRoute(pathname: string, href: string) {
  if (href === '/investments') return pathname === href;
  return isActiveRoute(pathname, href);
}

function NavLinkPendingIcon() {
  const { pending } = useLinkStatus();

  return (
    <Loader2
      aria-hidden="true"
      className={cn(
        'ml-auto h-3.5 w-3.5 shrink-0 animate-spin transition-opacity',
        pending ? 'opacity-100' : 'opacity-0'
      )}
    />
  );
}

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  sourceType: string | null;
  sourceId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

const NOTIFICATION_STALE_MS = 5 * 60 * 1000;

type TopbarProps = {
  subscriptionAccessUser?: SubscriptionAccessUser | null;
};

export default function Topbar({ subscriptionAccessUser }: TopbarProps) {
  const { data: session } = useSession();
  const { messages } = useI18n();
  const notificationCopy = messages.pages.notifications;
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [mobileInvestmentsOpen, setMobileInvestmentsOpen] = useState(() => pathname.startsWith('/investments'));
  const [mobileAdminOpen, setMobileAdminOpen] = useState(() => pathname.startsWith('/admin'));
  const [mobileUserAdminOpen, setMobileUserAdminOpen] = useState(() => pathname.startsWith('/admin/users'));
  const [mobileSubscriptionAdminOpen, setMobileSubscriptionAdminOpen] = useState(() => pathname.startsWith('/admin/subscriptions'));
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationToast, setNotificationToast] = useState<NotificationItem | null>(null);
  const [payingNotificationId, setPayingNotificationId] = useState<string | null>(null);
  const [notificationActionMessage, setNotificationActionMessage] = useState<Record<string, string>>({});
  const currentUser = session?.user;
  const accessUser = subscriptionAccessUser || currentUser;
  const userLocale = currentUser?.preferredLocale;
  const isAdmin = accessUser?.role === 'ADMIN';
  const isSubscriptionLocked = Boolean(accessUser) && !hasActiveSubscriptionAccess(accessUser);
  const isInvestmentsRoute = pathname.startsWith('/investments');
  const isAdminRoute = pathname.startsWith('/admin');
  const isUserAdminRoute = pathname.startsWith('/admin/users');
  const isSubscriptionAdminRoute = pathname.startsWith('/admin/subscriptions');
  const experienceMode = accessUser?.experienceMode;
  const visiblePrimaryNavItems = primaryNavItems.filter((item) => isVisibleForExperienceMode(item.href, experienceMode));
  const visibleInvestmentNavItems = investmentNavItems.filter((item) => isVisibleForExperienceMode(item.href, experienceMode));
  const visibleSecondaryNavItems = secondaryNavItems.filter((item) => isVisibleForExperienceMode(item.href, experienceMode));
  const showInvestments = visibleInvestmentNavItems.length > 0;
  const navHref = (href: string) => getSubscriptionLockedHref(href, isSubscriptionLocked ? accessUser : null);
  const navLabel = useCallback((label: string) => messages.navigation[label as keyof typeof messages.navigation] || label, [messages]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const latestNotificationIdRef = useRef<string | null>(null);
  const lastNotificationRefreshAtRef = useRef(0);
  const notificationLoadedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getNotificationAudioContext = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
      }

      return audioContextRef.current;
    } catch {
      return null;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = getNotificationAudioContext();
      if (!audioContext) return;

      const playTone = (startTime: number, frequency: number, peakGain: number) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.86, startTime + 0.12);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.24);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.26);
      };

      const now = audioContext.currentTime;
      playTone(now, 880, 0.18);
      playTone(now + 0.18, 1180, 0.16);
    } catch {
      // Browsers may block sound until the user has interacted with the page.
    }
  }, [getNotificationAudioContext]);

  const fetchNotifications = useCallback(async (options: { announceNew?: boolean } = {}) => {
    if (!session?.user?.id) return;
    const feed = await getNotificationFeedAction({ limit: 10 });
    const nextNotifications = feed.notifications as NotificationItem[];
    const latestNotification = nextNotifications[0] || null;
    const previousLatestId = latestNotificationIdRef.current;

    lastNotificationRefreshAtRef.current = Date.now();
    setNotifications(nextNotifications);
    setUnreadCount(feed.unreadCount);

    if (!notificationLoadedRef.current) {
      notificationLoadedRef.current = true;
      latestNotificationIdRef.current = latestNotification?.id || null;
      return;
    }

    if (
      options.announceNew
      && latestNotification
      && latestNotification.id !== previousLatestId
      && !latestNotification.isRead
      && latestNotification.actionUrl !== pathname
    ) {
      setNotificationToast(latestNotification);
    }

    latestNotificationIdRef.current = latestNotification?.id || null;
  }, [pathname, session?.user?.id]);

  useEffect(() => {
    const unlockAudio = () => {
      const audioContext = getNotificationAudioContext();
      if (audioContext?.state === 'suspended') {
        void audioContext.resume();
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [getNotificationAudioContext]);

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
    void fetchNotifications();
  }, [fetchNotifications, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const events = new EventSource('/api/notifications/events');

    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (payload.type === 'connected' || payload.type === 'heartbeat') return;
      } catch {
        return;
      }

      window.dispatchEvent(new CustomEvent('takapilot:server-event'));
      void fetchNotifications({ announceNew: true });
    };

    events.onerror = () => {
      // EventSource retries automatically; the bell keeps its last known state.
    };

    return () => {
      events.close();
    };
  }, [session?.user?.id, fetchNotifications]);

  useEffect(() => {
    if (!notificationToast) return;
    playNotificationSound();
    const timeoutId = window.setTimeout(() => setNotificationToast(null), 15000);
    return () => window.clearTimeout(timeoutId);
  }, [notificationToast, playNotificationSound]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const refreshIfVisible = () => {
      const isStale = Date.now() - lastNotificationRefreshAtRef.current > NOTIFICATION_STALE_MS;
      if (document.visibilityState === 'visible' && isStale) {
        void fetchNotifications({ announceNew: true });
      }
    };

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [session?.user?.id, fetchNotifications]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    await fetchNotifications();
  };

  const handleNotificationClick = async (id: string) => {
    await markNotificationReadAction(id);
    await fetchNotifications();
    setNotificationOpen(false);
    setNotificationToast(null);
  };

  const handlePayDpsReminder = async (notification: NotificationItem) => {
    if (!notification.sourceId) return;

    setPayingNotificationId(notification.id);
    setNotificationActionMessage((current) => ({ ...current, [notification.id]: '' }));

    try {
      const result = await payDpsInstallmentAction(notification.sourceId);
      if (result.success) {
        await markNotificationReadAction(notification.id);
        setNotificationActionMessage((current) => ({ ...current, [notification.id]: result.message }));
      } else {
        setNotificationActionMessage((current) => ({ ...current, [notification.id]: result.message }));
      }
      await fetchNotifications();
    } catch (error) {
      setNotificationActionMessage((current) => ({
        ...current,
        [notification.id]: error instanceof Error ? error.message : notificationCopy.payFailed,
      }));
    } finally {
      setPayingNotificationId(null);
    }
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
        <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label="Open navigation menu"
              className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <AppLogo
                size="sm"
                tagline={messages.brand.tagline}
                textClassName="truncate text-base"
                taglineClassName="hidden"
              />
            </div>
          </div>

          {/* Search (desktop) */}
          <div className="hidden lg:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                placeholder={messages.navigation.SearchTransactions}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <WorkspaceSwitcher className="hidden lg:ml-auto lg:block" />

          {/* Right side */}
          <div className="flex shrink-0 items-center justify-end gap-1 lg:gap-2">
            {isAdmin && (
              <Link
                href="/admin/payments"
                title={messages.navigation.ManualPaymentReview}
                aria-label={messages.navigation.ManualPaymentReview}
                className={cn(
                  'hidden rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200 sm:inline-flex',
                  isActiveRoute(pathname, '/admin/payments') && 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'
                )}
              >
                <ReceiptText className="h-5 w-5" />
              </Link>
            )}
            <LanguageSwitcher variant="topbar" display="full" className="hidden w-32 lg:flex" />
            <ThemeToggle />
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => {
                  const nextOpen = !notificationOpen;
                  setNotificationOpen(nextOpen);
                  if (nextOpen && Date.now() - lastNotificationRefreshAtRef.current > NOTIFICATION_STALE_MS) {
                    void fetchNotifications();
                  }
                }}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                aria-label={messages.navigation.Notifications}
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
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{messages.navigation.Notifications}</p>
                    <button
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 disabled:text-slate-400 dark:disabled:text-slate-600"
                    >
                      {messages.navigation.MarkAllRead}
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      {messages.navigation.NoNotifications}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => {
                        const isDpsReminder = notification.type === 'INVESTMENT_RETURN_DUE'
                          && notification.sourceType === 'INVESTMENT'
                          && Boolean(notification.sourceId);
                        const actionMessage = notificationActionMessage[notification.id];
                        const content = (
                          <div className={cn(
                            'flex gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors',
                            !notification.isRead && 'bg-indigo-50/50 dark:bg-indigo-500/10'
                          )}>
                            <div className={cn('mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', severityStyle[notification.severity] || severityStyle.INFO)}>
                              <SeverityIcon severity={notification.severity} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">{notification.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{notification.message}</p>
                              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{formatRelativeDate(notification.createdAt, userLocale)}</p>
                              {isDpsReminder && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void handlePayDpsReminder(notification);
                                    }}
                                    disabled={payingNotificationId === notification.id}
                                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                                  >
                                    {payingNotificationId === notification.id ? messages.navigation.Paying : messages.navigation.Pay}
                                  </button>
                                  {notification.actionUrl && (
                                    <Link
                                      href={notification.actionUrl}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void handleNotificationClick(notification.id);
                                      }}
                                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
                                    >
                                      {messages.navigation.Open}
                                    </Link>
                                  )}
                                </div>
                              )}
                              {actionMessage && (
                                <p className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                                  {actionMessage}
                                </p>
                              )}
                            </div>
                            {!notification.isRead && <span className="mt-2 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                          </div>
                        );

                        if (isDpsReminder) {
                          return (
                            <div key={notification.id}>
                              {content}
                            </div>
                          );
                        }

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
                className="flex items-center gap-2 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden md:block text-sm text-slate-900 dark:text-slate-200 truncate max-w-[170px]">{session?.user?.name}</span>
              </button>
              {userMenuOpen && (
                <div className="fixed left-3 right-3 top-16 z-50 rounded-xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700/50 dark:bg-slate-800 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-64 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="border-b border-slate-100 px-3 pb-3 dark:border-slate-700/50 lg:hidden">
                    <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Workspace</p>
                    <WorkspaceSwitcher className="w-full" />
                    <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/50">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Language</span>
                      <LanguageSwitcher variant="topbar" display="full" className="w-full justify-start" />
                    </div>
                  </div>
                  <Link href={navHref('/settings')} prefetch={!isSubscriptionLocked} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                    <Settings className="h-4 w-4" /> {messages.navigation.Settings}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> {messages.navigation.SignOut}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {notificationToast && (
        <div className="fixed right-4 top-20 z-50 w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 animate-in slide-in-from-top-2 fade-in duration-200 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex gap-3 p-4">
            <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', severityStyle[notificationToast.severity] || severityStyle.INFO)}>
              <SeverityIcon severity={notificationToast.severity} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-200">{notificationToast.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-300">{notificationToast.message}</p>
              <div className="mt-3 flex items-center gap-2">
                {notificationToast.actionUrl && (
                  <Link
                    href={notificationToast.actionUrl}
                    onClick={() => void handleNotificationClick(notificationToast.id)}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    {messages.navigation.Open}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setNotificationToast(null)}
                  className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {messages.navigation.Dismiss}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotificationToast(null)}
              className="h-8 w-8 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label={messages.navigation.Dismiss}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
              <AppLogo size="sm" tagline={messages.brand.tagline} taglineClassName="hidden" />
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {visiblePrimaryNavItems.map((item) => {
                const isActive = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={navHref(item.href)}
                    prefetch={!isSubscriptionLocked}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-slate-200 border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{navLabel(item.label)}</span>
                  </Link>
                );
              })}

              {showInvestments && (
              <div>
                <button
                  type="button"
                  onClick={() => setMobileInvestmentsOpen(!mobileInvestmentsOpen)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isInvestmentsRoute
                      ? 'text-indigo-700 dark:text-slate-200 bg-indigo-500/10 dark:bg-indigo-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                  )}
                  aria-expanded={mobileInvestmentsOpen}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span className="flex-1 text-left">{messages.navigation.Investments}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', mobileInvestmentsOpen && 'rotate-180')} />
                </button>

                {mobileInvestmentsOpen && (
                  <div className="mt-1 pl-4 space-y-1">
                    {visibleInvestmentNavItems.map((item) => {
                      const isActive = isActiveInvestmentRoute(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={navHref(item.href)}
                          prefetch={!isSubscriptionLocked}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                            isActive
                              ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-slate-200 border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{navLabel(item.label)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
              )}

              {visibleSecondaryNavItems.map((item) => {
                const isActive = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={navHref(item.href)}
                    prefetch={!isSubscriptionLocked}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-slate-200 border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{navLabel(item.label)}</span>
                  </Link>
                );
              })}

              {isAdmin && (
                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isAdminRoute
                        ? 'text-indigo-700 dark:text-slate-200 bg-indigo-500/10 dark:bg-indigo-500/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                    )}
                    aria-expanded={mobileAdminOpen}
                  >
                    <KeyRound className="h-5 w-5" />
                    <span className="flex-1 text-left">{messages.navigation.Admin}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', mobileAdminOpen && 'rotate-180')} />
                  </button>

                  {mobileAdminOpen && (
                    <div className="mt-1 pl-4 space-y-1">
                      <div>
                        <button
                          type="button"
                          onClick={() => setMobileUserAdminOpen(!mobileUserAdminOpen)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                            isUserAdminRoute
                              ? 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-slate-200'
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'
                          )}
                          aria-expanded={mobileUserAdminOpen}
                        >
                          <Users className="h-5 w-5" />
                          <span className="flex-1 text-left">{navLabel('Users')}</span>
                          <ChevronDown className={cn('h-4 w-4 transition-transform', mobileUserAdminOpen && 'rotate-180')} />
                        </button>

                        {mobileUserAdminOpen && (
                          <div className="mt-1 space-y-1 pl-4">
                            {userAdminNavItems.map((item) => {
                              const isActive = isActiveRoute(pathname, item.href);
                              return (
                                <Link
                                  key={item.href}
                                  href={navHref(item.href)}
                                  prefetch={!isSubscriptionLocked}
                                  onClick={() => setMobileOpen(false)}
                                  className={cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                    isActive
                                      ? 'border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:from-indigo-500/20 dark:to-purple-500/20 dark:text-slate-200'
                                      : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'
                                  )}
                                >
                                  <item.icon className="h-5 w-5" />
                                  <span>{navLabel(item.label)}</span>
                                  <NavLinkPendingIcon />
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => setMobileSubscriptionAdminOpen(!mobileSubscriptionAdminOpen)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                            isSubscriptionAdminRoute
                              ? 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-slate-200'
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'
                          )}
                          aria-expanded={mobileSubscriptionAdminOpen}
                        >
                          <KeyRound className="h-5 w-5" />
                          <span className="flex-1 text-left">{navLabel('Subscriptions')}</span>
                          <ChevronDown className={cn('h-4 w-4 transition-transform', mobileSubscriptionAdminOpen && 'rotate-180')} />
                        </button>

                        {mobileSubscriptionAdminOpen && (
                          <div className="mt-1 space-y-1 pl-4">
                            {subscriptionAdminNavItems.map((item) => {
                              const isActive = isActiveRoute(pathname, item.href);
                              return (
                                <Link
                                  key={item.href}
                                  href={navHref(item.href)}
                                  prefetch={!isSubscriptionLocked}
                                  onClick={() => setMobileOpen(false)}
                                  className={cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                                    isActive
                                      ? 'border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:from-indigo-500/20 dark:to-purple-500/20 dark:text-slate-200'
                                      : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'
                                  )}
                                >
                                  <item.icon className="h-5 w-5" />
                                  <span>{navLabel(item.label)}</span>
                                  <NavLinkPendingIcon />
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {adminNavItems.map((item) => {
                        const isActive = isActiveRoute(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={navHref(item.href)}
                            prefetch={!isSubscriptionLocked}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                              isActive
                                ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-slate-200 border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{navLabel(item.label)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
