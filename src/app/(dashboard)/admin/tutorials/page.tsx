import { getTutorialsAction } from '@/actions/tutorial.actions';
import TutorialManagementClient from '@/components/admin/TutorialManagementClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminTutorialsPage() {
  await requireRole('ADMIN');
  
  const tutorials = await getTutorialsAction(true);

  return <TutorialManagementClient tutorials={tutorials} />;
}
