import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { getFinancialNotes } from '@/services/financial-note.service';
import NotesPageClient from '@/components/notes/NotesPageClient';

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = await getEffectiveUserId();
  await validateAccess('NOTES', 'VIEW');

  let canEdit = true;
  try {
    await validateAccess('NOTES', 'EDIT');
  } catch {
    canEdit = false;
  }

  const result = await getFinancialNotes(userId, { limit: 200 });
  const userCurrency = (session.user as { currency?: string }).currency || 'BDT';

  return (
    <NotesPageClient
      notes={JSON.parse(JSON.stringify(result.notes))}
      canEdit={canEdit}
      userCurrency={userCurrency}
    />
  );
}
