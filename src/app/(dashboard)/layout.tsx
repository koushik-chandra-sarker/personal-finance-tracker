import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/90 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
