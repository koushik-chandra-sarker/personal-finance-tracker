import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/services/account.service';
import AccountPageClient from '@/components/accounts/AccountPageClient';

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const accounts = await getAccounts(session.user.id);
  return <AccountPageClient accounts={JSON.parse(JSON.stringify(accounts))} />;
}
