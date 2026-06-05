import Skeleton, { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-8 w-56" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/50 p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} className="h-11 w-full" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/50 p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
        <Skeleton className="mb-4 h-6 w-36" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
