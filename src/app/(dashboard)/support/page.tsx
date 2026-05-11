import { redirect } from 'next/navigation';
import SupportPageClient from '@/components/support/SupportPageClient';
import { auth } from '@/lib/auth';
import { getUserSupportDataAction } from '@/actions/support.actions';

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const data = await getUserSupportDataAction();
  return <SupportPageClient tickets={data.tickets} activePin={data.activePin} />;
}
