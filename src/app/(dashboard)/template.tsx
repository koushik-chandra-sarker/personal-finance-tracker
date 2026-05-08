import RecurringAutoProcessor from '@/components/recurring/RecurringAutoProcessor';

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RecurringAutoProcessor />
      {children}
    </>
  );
}
