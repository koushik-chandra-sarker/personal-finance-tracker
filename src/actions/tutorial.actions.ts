'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/rbac';
import * as tutorialService from '@/services/tutorial.service';
import { ActionResponse } from '@/types';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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
      return { success: false, message: 'শিরোনাম এবং YouTube URL প্রয়োজন' };
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
    return { success: true, message: 'টিউটোরিয়াল তৈরি হয়েছে' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'টিউটোরিয়াল তৈরি করা যায়নি') };
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
    return { success: true, message: 'টিউটোরিয়াল আপডেট হয়েছে' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'টিউটোরিয়াল আপডেট করা যায়নি') };
  }
}

export async function deleteTutorialAction(id: string): Promise<ActionResponse> {
  await requireRole('ADMIN');

  try {
    await tutorialService.deleteTutorial(id);
    revalidatePath('/admin/tutorials');
    revalidatePath('/tutorials');
    return { success: true, message: 'টিউটোরিয়াল ডিলিট হয়েছে' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'টিউটোরিয়াল ডিলিট করা যায়নি') };
  }
}
