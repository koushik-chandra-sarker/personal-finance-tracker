import Skeleton, { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

export default function InvestmentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80 max-w-full mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-36 rounded-full" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="rounded-lg border border-slate-200 bg-white/50 p-5 dark:border-slate-700/70 dark:bg-slate-800/50">
          <Skeleton className="h-6 w-44 mb-5" />
          <Skeleton className="h-[320px] w-full" />
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white/50 p-5 dark:border-slate-700/70 dark:bg-slate-800/50">
            <Skeleton className="h-5 w-28 mb-5" />
            <Skeleton className="h-44 w-44 rounded-full mx-auto" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white/50 p-5 dark:border-slate-700/70 dark:bg-slate-800/50">
            <Skeleton className="h-5 w-40 mb-4" />
            <TableSkeleton rows={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
