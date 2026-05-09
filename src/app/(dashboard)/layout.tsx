import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AdminMessagePresenter from '@/components/messages/AdminMessagePresenter';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getVisibleAdminMessagesForUser } from '@/services/admin-message.service';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });

  if (user?.mustChangePassword) {
    redirect('/change-password');
  }

  const adminMessages = await getVisibleAdminMessagesForUser(session.user.id);
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
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50/90 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
        <Topbar />
        <AdminMessagePresenter initialMessages={serializedAdminMessages} />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden max-w-full relative">
          {children}
        </main>
      </div>
    </div>
  );
}
