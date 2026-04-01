'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { categorySchema } from '@/lib/validations/category';
import * as categoryService from '@/services/category.service';
import type { ActionResponse } from '@/types';

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function createCategoryAction(formData: FormData): Promise<ActionResponse> {
  try {
    const userId = await getUserId();
    const raw = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      color: formData.get('color') as string,
      icon: formData.get('icon') as string,
    };
    
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

    await categoryService.createCategory(userId, parsed.data);
    revalidatePath('/dashboard');
    revalidatePath('/categories');
    revalidatePath('/transactions');
    revalidatePath('/budgets');
    
    return { success: true, message: 'Category created successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to create category' };
  }
}

export async function updateCategoryAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const userId = await getUserId();
    const raw = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      color: formData.get('color') as string,
      icon: formData.get('icon') as string,
    };
    
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

    await categoryService.updateCategory(userId, id, parsed.data);
    revalidatePath('/dashboard');
    revalidatePath('/categories');
    revalidatePath('/transactions');
    revalidatePath('/budgets');

    return { success: true, message: 'Category updated successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to update category' };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResponse> {
  try {
    const userId = await getUserId();
    await categoryService.deleteCategory(userId, id);
    revalidatePath('/dashboard');
    revalidatePath('/categories');
    revalidatePath('/transactions');
    revalidatePath('/budgets');
    return { success: true, message: 'Category deleted' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete category' };
  }
}
