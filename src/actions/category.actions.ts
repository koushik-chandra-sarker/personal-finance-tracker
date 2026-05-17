'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { categorySchema } from '@/lib/validations/category';
import * as categoryService from '@/services/category.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
export async function createCategoryAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const executorId = session.user.id;
    const userId = await getEffectiveUserId();
    await validateAccess('TRANSACTIONS', 'EDIT');
    const raw = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      color: formData.get('color') as string,
      icon: formData.get('icon') as string,
    };
    
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

    await categoryService.createCategory(userId, executorId, parsed.data);
    revalidatePath('/dashboard');
    revalidatePath('/categories');
    revalidatePath('/transactions');
    revalidatePath('/budgets');
    
    return { success: true, message: 'ক্যাটাগরি তৈরি হয়েছে' };
  } catch (error: any) {
    return { success: false, message: error.message || 'ক্যাটাগরি তৈরি করা যায়নি' };
  }
}

export async function updateCategoryAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const executorId = session.user.id;
    const userId = await getEffectiveUserId();
    await validateAccess('TRANSACTIONS', 'EDIT');
    const raw = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      color: formData.get('color') as string,
      icon: formData.get('icon') as string,
    };
    
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

    await categoryService.updateCategory(userId, executorId, id, parsed.data);
    revalidatePath('/dashboard');
    revalidatePath('/categories');
    revalidatePath('/transactions');
    revalidatePath('/budgets');

    return { success: true, message: 'ক্যাটাগরি আপডেট হয়েছে' };
  } catch (error: any) {
    return { success: false, message: error.message || 'ক্যাটাগরি আপডেট করা যায়নি' };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResponse> {
  try {
    const userId = await getEffectiveUserId();
    await validateAccess('TRANSACTIONS', 'EDIT');
    await categoryService.deleteCategory(userId, id);
    revalidatePath('/dashboard');
    revalidatePath('/categories');
    revalidatePath('/transactions');
    revalidatePath('/budgets');
    return { success: true, message: 'ক্যাটাগরি ডিলিট হয়েছে' };
  } catch (error: any) {
    return { success: false, message: error.message || 'ক্যাটাগরি ডিলিট করা যায়নি' };
  }
}
