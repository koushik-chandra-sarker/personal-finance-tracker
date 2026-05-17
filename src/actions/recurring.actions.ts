'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recurringSchema } from '@/lib/validations/recurring';
import * as recurringService from '@/services/recurring.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { hasActiveSubscription } from '@/lib/rbac';
export async function getRecurringAction() {
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');
  return recurringService.getRecurringTransactions(userId);
}

export async function createRecurringAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'EDIT');
  const raw = {
    accountId: formData.get('accountId') as string,
    categoryId: formData.get('categoryId') as string,
    type: formData.get('type') as string,
    amount: formData.get('amount') as string,
    description: formData.get('description') as string,
    frequency: formData.get('frequency') as string,
    nextRunDate: formData.get('nextRunDate') as string,
  };
  const parsed = recurringSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

  await recurringService.createRecurringTransaction(userId, executorId, parsed.data);
  revalidatePath('/recurring');
  return { success: true, message: 'পুনরাবৃত্ত লেনদেন তৈরি হয়েছে' };
}

export async function toggleRecurringAction(id: string): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'EDIT');
  await recurringService.toggleRecurring(userId, executorId, id);
  revalidatePath('/recurring');
  return { success: true, message: 'স্ট্যাটাস পরিবর্তন হয়েছে' };
}

export async function deleteRecurringAction(id: string): Promise<ActionResponse> {
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'EDIT');
  await recurringService.deleteRecurringTransaction(userId, id);
  revalidatePath('/recurring');
  return { success: true, message: 'পুনরাবৃত্ত লেনদেন ডিলিট হয়েছে' };
}

export async function processDueRecurringAction(): Promise<{ success: boolean; processed: number }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, processed: 0 };
  if (!(await hasActiveSubscription(session.user.id))) return { success: false, processed: 0 };

  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'EDIT');

  const processed = await recurringService.processRecurringTransactions({
    userId,
    executorId: session.user.id,
  });

  if (processed > 0) {
    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/reports');
    revalidatePath('/recurring');
  }

  return { success: true, processed };
}
