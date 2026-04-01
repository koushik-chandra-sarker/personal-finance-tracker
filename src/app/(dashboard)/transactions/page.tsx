import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTransactions } from '@/services/transaction.service';
import { prisma } from '@/lib/prisma';
import TransactionPageClient from '@/components/transactions/TransactionPageClient';

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const limit = 20;

  const filters = {
    page,
    limit,
    search: params.search,
    type: params.type as 'INCOME' | 'EXPENSE' | undefined,
    categoryId: params.categoryId,
    accountId: params.accountId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const [{ transactions, total, pages }, categories, accounts] = await Promise.all([
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
    />
  );
}
