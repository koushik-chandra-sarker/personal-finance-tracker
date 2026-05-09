'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/rbac';
import * as tutorialService from '@/services/tutorial.service';
import { ActionResponse } from '@/types';

export async function getTutorialsAction(isAdmin: boolean = false) {
  if (isAdmin) {
    await requireRole('ADMIN');
  }
  return tutorialService.getTutorials(isAdmin);
}

export async function createTutorialAction(formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');

  try {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const youtubeUrl = formData.get('youtubeUrl') as string;
    const category = formData.get('category') as string;
    const isActive = formData.get('isActive') === 'on';
    const isPremium = formData.get('isPremium') === 'on';
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;

    if (!title || !youtubeUrl) {
      return { success: false, message: 'Title and YouTube URL are required' };
    }

    await tutorialService.createTutorial({
      title,
      description,
      youtubeUrl,
      category,
      isActive,
      isPremium,
      sortOrder,
    });

    revalidatePath('/admin/tutorials');
    revalidatePath('/tutorials');
    return { success: true, message: 'Tutorial created successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create tutorial' };
  }
}

export async function updateTutorialAction(id: string, formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');

  try {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const youtubeUrl = formData.get('youtubeUrl') as string;
    const category = formData.get('category') as string;
    const isActive = formData.get('isActive') === 'on';
    const isPremium = formData.get('isPremium') === 'on';
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;

    await tutorialService.updateTutorial(id, {
      title,
      description,
      youtubeUrl,
      category,
      isActive,
      isPremium,
      sortOrder,
    });

    revalidatePath('/admin/tutorials');
    revalidatePath('/tutorials');
    return { success: true, message: 'Tutorial updated successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to update tutorial' };
  }
}

export async function deleteTutorialAction(id: string): Promise<ActionResponse> {
  await requireRole('ADMIN');

  try {
    await tutorialService.deleteTutorial(id);
    revalidatePath('/admin/tutorials');
    revalidatePath('/tutorials');
    return { success: true, message: 'Tutorial deleted successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete tutorial' };
  }
}
