import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, Landmark, ReceiptText, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { getMonthlyExpenseDetails, getRegularMonthlyTransactionCategories } from '@/services/transaction.service';
import { getMessages } from '@/i18n/messages';
import { getRequestLocale } from '@/i18n/server';
import { formatCurrency, formatDate, formatNumber, getMonthName } from '@/lib/utils';
import MonthlyExpenseFilters from '@/components/monthly-expenses/MonthlyExpenseFilters';

type MonthlyExpensesSearchParams = {
  month?: string;
  year?: string;
  categoryId?: string;
  accountId?: string;
  page?: string;
};

function clampMonth(value: string | undefined, fallback: number) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback;
}

function parseYear(value: string | undefined, fallback: number) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback;
}

function pageHref(params: {
  month: number;
  year: number;
  page?: number;
  categoryId?: string;
  accountId?: string;
}) {
  const search = new URLSearchParams({
    month: String(params.month),
    year: String(params.year),
  });
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.categoryId) search.set('categoryId', params.categoryId);
  if (params.accountId) search.set('accountId', params.accountId);
  return `/monthly-expenses?${search.toString()}`;
}

export default async function MonthlyExpensesPage({
  searchParams,
}: {
  searchParams: Promise<MonthlyExpensesSearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');

  const params = await searchParams;
  const now = new Date();
  const month = clampMonth(params.month, now.getMonth() + 1);
  const year = parseYear(params.year, now.getFullYear());
  const page = Math.max(1, Number(params.page || 1) || 1);
  const locale = session.user.preferredLocale || await getRequestLocale();
  const messages = getMessages(locale);
  const copy = messages.pages.monthlyExpenses;

  const [details, categories, accounts, owner] = await Promise.all([
    getMonthlyExpenseDetails(userId, {
      month,
      year,
      page,
      limit: 50,
      categoryId: params.categoryId,
      accountId: params.accountId,
    }),
    getRegularMonthlyTransactionCategories(userId, {
      month,
      year,
      accountId: params.accountId,
    }),
    prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
  ]);

  const currency = owner?.currency || session.user.currency || 'BDT';
  const monthLabel = `${getMonthName(month, locale)} ${formatNumber(year, { useGrouping: false }, locale)}`;
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: getMonthName(index + 1, locale),
  }));
  const currentMonthEnd = new Date(year, month, 0);
  const dayCount = now.getFullYear() === year && now.getMonth() + 1 === month
    ? now.getDate()
    : currentMonthEnd.getDate();
  const dailyAverage = details.totalRegularExpense / Math.max(1, dayCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ReceiptText className="h-4 w-4" />
          {copy.fullLedger}
        </Link>
      </div>

      <MonthlyExpenseFilters
        key={`${month}-${year}-${params.categoryId || 'all'}-${params.accountId || 'all'}`}
        month={month}
        year={year}
        categoryId={params.categoryId}
        accountId={params.accountId}
        monthLabel={monthLabel}
        monthOptions={monthOptions}
        categories={categories}
        accounts={accounts}
        copy={{
          previousMonth: copy.previousMonth,
          nextMonth: copy.nextMonth,
          allCategories: copy.allCategories,
          allAccounts: copy.allAccounts,
          apply: copy.apply,
          applying: copy.applying,
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.regularIncome}</p>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(details.totalRegularIncome, currency, locale)}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.incomeExcludes}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.regularExpense}</p>
            <TrendingDown className="h-5 w-5 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(details.totalRegularExpense, currency, locale)}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.excludes}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.regularNet}</p>
            <WalletCards className="h-5 w-5 text-indigo-500" />
          </div>
          <p className={`text-2xl font-bold ${details.regularNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {details.regularNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(details.regularNet), currency, locale)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.incomeMinusExpense}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.dailyAverage}</p>
            <CalendarDays className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(dailyAverage, currency, locale)}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.basedOnDays.replace('{days}', formatNumber(dayCount, undefined, locale))}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{copy.cashMovement}</h2>
          <div className="mt-4 space-y-3">
            {[
              [copy.regularIncome, details.totalRegularIncome, 'text-emerald-600 dark:text-emerald-400'],
              [copy.regularExpense, details.totalRegularExpense, 'text-rose-600 dark:text-rose-400'],
              [copy.regularNet, details.regularNet, details.regularNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'],
              [copy.savingsTransfers, details.savingsExpense, 'text-emerald-600 dark:text-emerald-400'],
              [copy.investmentsDps, details.investmentExpense, 'text-indigo-600 dark:text-indigo-400'],
              [copy.allCashOut, details.totalExpense, 'text-slate-900 dark:text-slate-100'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950/50">
                <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                <span className={`text-sm font-semibold ${color}`}>{formatCurrency(Number(value), currency, locale)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60 lg:col-span-2">
          <div className="grid gap-5 xl:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{copy.incomeBreakdown}</h2>
              <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {details.incomeCategoryBreakdown.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">{copy.noRegularIncome}</p>
                ) : details.incomeCategoryBreakdown.map(category => (
                  <div key={category.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{category.categoryName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.entries.replace('{count}', formatNumber(category.count, undefined, locale))}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(category.total, currency, locale)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatNumber(category.percentage, undefined, locale)}%</p>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full" style={{ width: `${category.percentage}%`, backgroundColor: category.categoryColor }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{copy.categoryBreakdown}</h2>
              <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {details.categoryBreakdown.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">{copy.noRegularExpense}</p>
            ) : details.categoryBreakdown.map(category => (
              <div key={category.categoryId} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{category.categoryName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{copy.entries.replace('{count}', formatNumber(category.count, undefined, locale))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(category.total, currency, locale)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatNumber(category.percentage, undefined, locale)}%</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full" style={{ width: `${category.percentage}%`, backgroundColor: category.categoryColor }} />
                </div>
              </div>
            ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{copy.details}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {copy.showingRegular.replace('{count}', formatNumber(details.total, undefined, locale))}
            </p>
          </div>
          <Landmark className="hidden h-5 w-5 text-slate-400 sm:block" />
        </div>

        <div className="max-h-[560px] overflow-y-auto">
          {details.transactions.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">{copy.noRegularTransactions}</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {details.transactions.map(transaction => (
                <div key={transaction.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{transaction.description}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {transaction.category.name} · {transaction.account.name} · {formatDate(transaction.date, undefined, locale)}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${transaction.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(transaction.amount), currency, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {details.pages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700/50">
            {Array.from({ length: details.pages }, (_, index) => index + 1).map(item => (
              <Link
                key={item}
                href={pageHref({ month, year, page: item, categoryId: params.categoryId, accountId: params.accountId })}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  details.currentPage === item
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {formatNumber(item, { useGrouping: false }, locale)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
