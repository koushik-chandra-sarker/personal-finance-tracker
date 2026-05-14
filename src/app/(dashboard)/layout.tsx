import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AdminMessagePresenter from '@/components/messages/AdminMessagePresenter';
import AppPinGate from '@/components/security/AppPinGate';
import SupportViewBanner from '@/components/support/SupportViewBanner';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppPinUnlockState } from '@/lib/app-pin';
import { redirect } from 'next/navigation';
import { getVisibleAdminMessagesForUser } from '@/services/admin-message.service';
import { getActiveSupportViewAction } from '@/actions/support.actions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true, appPinHash: true, appPinSetAt: true },
  });

  if (user?.mustChangePassword) {
    redirect('/change-password');
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
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
          <Topbar />
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
