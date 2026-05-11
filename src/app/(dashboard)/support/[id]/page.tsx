import { notFound, redirect } from 'next/navigation';
import SupportTicketDetailClient from '@/components/support/SupportTicketDetailClient';
import { getUserSupportTicketAction } from '@/actions/support.actions';
import { auth } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SupportTicketPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;
  let ticket;
  try {
    ticket = await getUserSupportTicketAction(id);
  } catch {
    notFound();
  }

  return <SupportTicketDetailClient ticket={ticket} />;
}
