import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/services/account.service';
import AccountPageClient from '@/components/accounts/AccountPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('ACCOUNTS', 'VIEW');
  const accounts = await getAccounts(userId);
  return <AccountPageClient accounts={JSON.parse(JSON.stringify(accounts))} />;
}
