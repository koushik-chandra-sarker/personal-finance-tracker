export default function SubscriptionsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-56 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-[520px] rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
