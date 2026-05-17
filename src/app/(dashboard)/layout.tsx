import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AdminMessagePresenter from '@/components/messages/AdminMessagePresenter';
import AppPinGate from '@/components/security/AppPinGate';
import SupportViewBanner from '@/components/support/SupportViewBanner';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppPinUnlockState } from '@/lib/app-pin';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getVisibleAdminMessagesForUser } from '@/services/admin-message.service';
import { getActiveSupportViewAction } from '@/actions/support.actions';
import { getSubscriptionBlockReason, hasActiveSubscriptionAccess, isSubscriptionUnlockedPath } from '@/lib/subscription-access';

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
        appPinHash: true,
        appPinSetAt: true,
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

  const requestPathname = headerStore.get('x-pathname') || '';
  const requestSearch = headerStore.get('x-search') || '';
  const subscriptionAccessUser = {
    role: user.role,
    status: user.status,
    subscriptionPlan: user.subscription?.plan || null,
    subscriptionInterval: user.subscription?.interval || null,
    subscriptionSource: user.subscription?.source || null,
    subscriptionStatus: user.subscription?.status || null,
    subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd?.toISOString() || null,
    subscriptionCancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || false,
  };

  if (!isSubscriptionUnlockedPath(requestPathname) && !hasActiveSubscriptionAccess(subscriptionAccessUser)) {
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
    <AppPinGate state={{ hasPin: hasAppPin, isUnlocked: isAppPinUnlocked, userId: session.user.id, unlockKey: appPinSetAt?.toISOString() || null }}>
      <div className="flex h-[100dvh] overflow-hidden bg-slate-50/90 dark:bg-slate-950">
        <Sidebar subscriptionAccessUser={subscriptionAccessUser} />
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
          <Topbar subscriptionAccessUser={subscriptionAccessUser} />
          {supportView && <SupportViewBanner supportView={supportView} />}
          <AdminMessagePresenter initialMessages={serializedAdminMessages} />
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden max-w-full relative">
            {children}
          </main>
        </div>
      </div>
    </AppPinGate>
  );
}
