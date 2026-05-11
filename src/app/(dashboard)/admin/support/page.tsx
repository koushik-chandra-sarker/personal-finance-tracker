import { redirect } from 'next/navigation';
import AdminSupportClient from '@/components/support/AdminSupportClient';
import { getAdminSupportDataAction } from '@/actions/support.actions';
import { auth } from '@/lib/auth';
import type { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from '@prisma/client';

type Props = {
  searchParams: Promise<{
    status?: string | string[];
    priority?: string | string[];
    category?: string | string[];
    search?: string | string[];
  }>;
};

const statusValues = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const priorityValues = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
const categoryValues = ['GENERAL', 'BILLING', 'BUG_REPORT', 'FEATURE_REQUEST', 'ACCOUNT_ISSUE'] as const;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || '';
}

function parseFilter<T extends string>(value: string, allowed: readonly T[]) {
  return allowed.includes(value as T) ? value as T : 'all';
}

export default async function AdminSupportPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const params = await searchParams;
  const filters = {
    status: parseFilter(firstParam(params.status), statusValues),
    priority: parseFilter(firstParam(params.priority), priorityValues),
    category: parseFilter(firstParam(params.category), categoryValues),
    search: firstParam(params.search),
  };

  const tickets = await getAdminSupportDataAction({
    status: filters.status as SupportTicketStatus | 'all',
    priority: filters.priority as SupportTicketPriority | 'all',
    category: filters.category as SupportTicketCategory | 'all',
    search: filters.search,
  });

  return <AdminSupportClient tickets={tickets} filters={filters} />;
}
