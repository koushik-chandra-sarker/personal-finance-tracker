'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import * as shareService from '@/services/share.service';
import type { ActionResponse } from '@/types';
import { Feature, AccessLevel } from '@prisma/client';
import { requireSubscriptionPlan } from '@/lib/rbac';

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function inviteCollaboratorAction(formData: FormData): Promise<ActionResponse> {
  try {
    const ownerId = await getUserId();
    await requireSubscriptionPlan(ownerId, 'PRO');
    const email = formData.get('email') as string;
    
    if (!email) return { success: false, message: 'Email is required' };
    
    await shareService.inviteCollaborator(ownerId, email);
    revalidatePath('/settings');
    return { success: true, message: 'Collaborator invited successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to invite collaborator' };
  }
}

export async function getCollaboratorsAction() {
  const ownerId = await getUserId();
  return shareService.getCollaborators(ownerId);
}

export async function updateFeatureAccessAction(
  sharedAccessId: string, 
  feature: Feature, 
  accessLevel: AccessLevel
): Promise<ActionResponse> {
  try {
    const ownerId = await getUserId();
    await shareService.updateFeatureAccess(ownerId, sharedAccessId, feature, accessLevel);
    revalidatePath('/settings');
    return { success: true, message: 'Access updated successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to update access' };
  }
}

export async function removeCollaboratorAction(sharedAccessId: string): Promise<ActionResponse> {
  try {
    const ownerId = await getUserId();
    await shareService.removeCollaborator(ownerId, sharedAccessId);
    revalidatePath('/settings');
    return { success: true, message: 'Collaborator removed successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to remove collaborator' };
  }
}

import { cookies } from 'next/headers';
import { WORKSPACE_COOKIE } from '@/lib/access';

export async function setActiveWorkspaceAction(workspaceId: string | null): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    if (workspaceId) {
      cookieStore.set(WORKSPACE_COOKIE, workspaceId, { path: '/' });
    } else {
      cookieStore.delete(WORKSPACE_COOKIE);
    }
    revalidatePath('/', 'layout');
    return { success: true, message: 'Workspace switched' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to switch workspace' };
  }
}
