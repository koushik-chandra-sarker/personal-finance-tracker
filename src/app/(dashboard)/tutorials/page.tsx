import { getTutorialsAction } from '@/actions/tutorial.actions';
import TutorialList from '@/components/tutorials/TutorialList';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TutorialsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const tutorials = await getTutorialsAction(false);
  const isPro = session.user.subscriptionPlan === 'PRO';

  return (
    <div className="container mx-auto px-4 py-8">
      <TutorialList tutorials={tutorials} isPro={isPro} />
    </div>
  );
}
