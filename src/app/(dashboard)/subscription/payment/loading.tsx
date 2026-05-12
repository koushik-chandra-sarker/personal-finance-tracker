import Card from '@/components/ui/Card';

export default function SubscriptionPaymentLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
        </div>
        <div className="h-12 w-72 max-w-full animate-pulse rounded-2xl bg-amber-100 dark:bg-amber-500/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <div className="mb-5 flex items-start gap-3">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700/60" />
              <div className="flex-1">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
                <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
              ))}
            </div>
          </Card>

          <Card>
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="mt-5 h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900/50" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
            </div>
            <div className="mt-5 h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
          </Card>
          <Card>
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="mt-4 space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900/50" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
