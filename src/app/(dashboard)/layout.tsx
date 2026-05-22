import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AdminMessagePresenter from '@/components/messages/AdminMessagePresenter';
import BrowserNotificationManager from '@/components/messages/BrowserNotificationManager';
import AppPinGate from '@/components/security/AppPinGate';
import PendingPaymentAccessBanner from '@/components/subscription/PendingPaymentAccessBanner';
import TrialAccessBanner from '@/components/subscription/TrialAccessBanner';
import SupportViewBanner from '@/components/support/SupportViewBanner';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppPinUnlockState } from '@/lib/app-pin';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getVisibleAdminMessagesForUser } from '@/services/admin-message.service';
import { getActiveSupportViewAction } from '@/actions/support.actions';
import { isBasicModeBlockedPath } from '@/lib/experience-mode';
import { getPendingPaymentAccessState } from '@/lib/pending-payment-access';
import { getSubscriptionBlockReason, hasActiveSubscriptionAccess, isSubscriptionUnlockedPath } from '@/lib/subscription-access';

function getRequestPath(headerStore: Headers) {
  const pathname = headerStore.get('x-pathname');
  const search = headerStore.get('x-search') || '';
  if (pathname) return { pathname, search };

  const nextUrl = headerStore.get('next-url');
  if (!nextUrl) return { pathname: '', search: '' };

  try {
    const parsedUrl = new URL(nextUrl, 'http://localhost');
    return { pathname: parsedUrl.pathname, search: parsedUrl.search };
  } catch {
    return { pathname: '', search: '' };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [user, headerStore] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        status: true,
        lockedUntil: true,
        mustChangePassword: true,
        experienceMode: true,
        onboardingCompletedAt: true,
        appPinHash: true,
        appPinSetAt: true,
        appPinReminderAt: true,
        subscription: {
          select: {
            plan: true,
            interval: true,
            source: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
        manualPaymentRequests: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            createdAt: true,
            package: { select: { name: true } },
          },
        },
      },
    }),
    headers(),
  ]);

  if (!user || user.status !== 'ACTIVE' || (user.lockedUntil && user.lockedUntil > new Date())) {
    redirect('/login');
  }

  if (user?.mustChangePassword) {
    redirect('/change-password');
  }

  const { pathname: requestPathname, search: requestSearch } = getRequestPath(headerStore);

  if (!user.onboardingCompletedAt) {
    const params = new URLSearchParams();
    if (requestPathname) params.set('next', `${requestPathname}${requestSearch}`);
    redirect(`/onboarding${params.size ? `?${params.toString()}` : ''}`);
  }

  if (requestPathname && isBasicModeBlockedPath(requestPathname, user.experienceMode)) {
    redirect('/dashboard');
  }

  const pendingPaymentAccess = getPendingPaymentAccessState(user.manualPaymentRequests[0] || null);
  const subscriptionAccessUser = {
    role: user.role,
    status: user.status,
    experienceMode: user.experienceMode,
    subscriptionPlan: user.subscription?.plan || null,
    subscriptionInterval: user.subscription?.interval || null,
    subscriptionSource: user.subscription?.source || null,
    subscriptionStatus: user.subscription?.status || null,
    subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd?.toISOString() || null,
    subscriptionCancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || false,
    pendingPaymentAccessUntil: pendingPaymentAccess.accessUntil?.toISOString() || null,
  };
  const trialPeriodEnd = user.subscription?.status === 'TRIALING' && user.subscription.currentPeriodEnd
    ? user.subscription.currentPeriodEnd
    : null;
  const now = new Date();
  const trialDaysRemaining = trialPeriodEnd
    ? Math.max(0, Math.ceil((trialPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (requestPathname && !isSubscriptionUnlockedPath(requestPathname) && !hasActiveSubscriptionAccess(subscriptionAccessUser)) {
    const params = new URLSearchParams({ reason: getSubscriptionBlockReason(subscriptionAccessUser) });
    if (requestPathname) params.set('next', `${requestPathname}${requestSearch}`);
    redirect(`/subscription?${params.toString()}`);
  }

  const appPinSetAt = user?.appPinSetAt || null;
  const hasAppPin = Boolean(user?.appPinHash && appPinSetAt);
  const [adminMessages, supportView, isAppPinUnlocked] = await Promise.all([
    getVisibleAdminMessagesForUser(session.user.id),
    getActiveSupportViewAction(),
    getAppPinUnlockState(session.user.id, appPinSetAt),
  ]);
  const serializedAdminMessages = adminMessages.map((message) => ({
    id: message.id,
    title: message.title,
    message: message.message,
    severity: message.severity,
    displayMode: message.displayMode,
    frequency: message.frequency,
    actionLabel: message.actionLabel,
    actionUrl: message.actionUrl,
  }));

  return (
    <AppPinGate state={{
      hasPin: hasAppPin,
      isUnlocked: isAppPinUnlocked,
      userId: session.user.id,
      unlockKey: appPinSetAt?.toISOString() || null,
      reminderAt: user.appPinReminderAt?.toISOString() || null,
    }}>
      <div className="flex h-[100dvh] overflow-hidden bg-slate-50/90 dark:bg-slate-950">
        <Sidebar subscriptionAccessUser={subscriptionAccessUser} />
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
          <Topbar subscriptionAccessUser={subscriptionAccessUser} />
          {supportView && <SupportViewBanner supportView={supportView} />}
          {trialPeriodEnd && trialPeriodEnd >= now && (
            <TrialAccessBanner
              currentPeriodEnd={trialPeriodEnd.toISOString()}
              daysRemaining={trialDaysRemaining}
            />
          )}
          {!trialPeriodEnd && pendingPaymentAccess.isActive && pendingPaymentAccess.accessUntil && (
            <PendingPaymentAccessBanner
              accessUntil={pendingPaymentAccess.accessUntil.toISOString()}
              packageName={pendingPaymentAccess.request?.package?.name || null}
              hours={pendingPaymentAccess.hours}
            />
          )}
          <AdminMessagePresenter initialMessages={serializedAdminMessages} />
          <BrowserNotificationManager />
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden max-w-full relative">
            {children}
          </main>
        </div>
      </div>
    </AppPinGate>
  );
}
