import Skeleton, { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

export default function AdminSubscriptionsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/70">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/70"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-5 h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/50 p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
        <Skeleton className="mb-4 h-6 w-44" />
        <TableSkeleton rows={4} />
      </div>
    </div>
  );
}
