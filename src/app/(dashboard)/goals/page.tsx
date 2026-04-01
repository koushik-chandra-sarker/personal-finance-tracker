import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getGoals } from '@/services/goal.service';
import GoalPageClient from '@/components/goals/GoalPageClient';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const goals = await getGoals(session.user.id);
  return <GoalPageClient goals={JSON.parse(JSON.stringify(goals))} />;
}
