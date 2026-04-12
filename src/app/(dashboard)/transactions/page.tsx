import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTransactions } from '@/services/transaction.service';
import { prisma } from '@/lib/prisma';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import TransactionPageClient from '@/components/transactions/TransactionPageClient';
import { format } from 'date-fns';

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');

  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const limit = 20;

  // Calculate default date range (current month)
  const now = new Date();
  const firstDayOfMonth = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const lastDayOfMonth = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

  const dateFrom = params.dateFrom || firstDayOfMonth;
  const dateTo = params.dateTo || lastDayOfMonth;

  const filters = {
    page,
    limit,
    search: params.search,
    type: params.type as 'INCOME' | 'EXPENSE' | undefined,
    categoryId: params.categoryId,
    accountId: params.accountId,
    dateFrom,
    dateTo,
  };

  const [{ transactions, total, pages, totalIncome, totalExpense }, categories, accounts] = await Promise.all([
    getTransactions(userId, filters),
    prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({ where: { userId, isActive: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <TransactionPageClient
      initialTransactions={JSON.parse(JSON.stringify(transactions))}
      categories={JSON.parse(JSON.stringify(categories))}
      accounts={JSON.parse(JSON.stringify(accounts))}
      total={total}
      pages={pages}
      currentPage={page}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      dateFrom={dateFrom}
      dateTo={dateTo}
    />
  );
}
