import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getGoals } from '@/services/goal.service';
import GoalPageClient from '@/components/goals/GoalPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('GOALS', 'VIEW');
  const goals = await getGoals(userId);
  return <GoalPageClient goals={JSON.parse(JSON.stringify(goals))} />;
}
