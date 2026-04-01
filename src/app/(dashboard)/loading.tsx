import Skeleton, { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Main content rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 p-6 space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
        <div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-64 w-full max-w-[250px] rounded-full mx-auto" />
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 p-6">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
