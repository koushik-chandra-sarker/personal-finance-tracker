import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';

export default function SupportLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
