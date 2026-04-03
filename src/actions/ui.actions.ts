'use server';

import { auth } from '@/lib/auth';
import { getAccessibleWorkspaces } from '@/services/share.service';
import { getActiveWorkspace } from '@/lib/access';

export async function getAccessibleWorkspacesAction() {
  const session = await auth();
  if (!session?.user?.id) return { spaces: [], activeId: null };

  const spaces = await getAccessibleWorkspaces(session.user.id);
  const activeId = await getActiveWorkspace();

  return { spaces, activeId };
}
