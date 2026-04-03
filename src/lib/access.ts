import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Feature, AccessLevel } from '@prisma/client';

export const WORKSPACE_COOKIE = 'pft_active_workspace';

export async function getActiveWorkspace(): Promise<string | null> {
  const cookieStore = await cookies();
  const workspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  return workspaceId || null;
}

export async function getEffectiveUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const currentUserId = session.user.id;
  const activeWorkspaceId = await getActiveWorkspace();

  // If no workspace is explicitly set, the user is in their own workspace
  if (!activeWorkspaceId || activeWorkspaceId === currentUserId) {
    return currentUserId;
  }

  // Return the active workspace ID (owner's ID)
  return activeWorkspaceId;
}

export async function validateAccess(feature: Feature, requiredLevel: AccessLevel): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const currentUserId = session.user.id;
  const activeWorkspaceId = await getActiveWorkspace();

  // If no workspace is selected or they are in their own workspace, they have full access
  if (!activeWorkspaceId || activeWorkspaceId === currentUserId) {
    return;
  }

  // Check if they have been granted access to this workspace by the owner
  const sharedAccess = await prisma.sharedAccess.findUnique({
    where: {
      ownerId_collaboratorId: {
        ownerId: activeWorkspaceId,
        collaboratorId: currentUserId,
      }
    },
    include: {
      permissions: {
        where: { feature }
      }
    }
  });

  if (!sharedAccess) {
    throw new Error('You do not have access to this workspace.');
  }

  const featurePermission = sharedAccess.permissions[0];
  const actualLevel = featurePermission?.accessLevel || 'NONE';

  // requiredLevel check strategy
  // If required is EDIT, actual must be EDIT.
  // If required is VIEW, actual can be VIEW or EDIT.
  if (requiredLevel === 'EDIT') {
    if (actualLevel !== 'EDIT') {
      throw new Error(`You need EDIT access for ${feature} to perform this action.`);
    }
  } else if (requiredLevel === 'VIEW') {
    if (actualLevel === 'NONE') {
      throw new Error(`You need at least VIEW access for ${feature} to perform this action.`);
    }
  } else if (requiredLevel === 'NONE') {
    // Nothing required.
    return;
  } else {
    throw new Error(`Unknown access level required: ${requiredLevel}`);
  }
}
