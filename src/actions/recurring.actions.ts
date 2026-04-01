'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recurringSchema } from '@/lib/validations/recurring';
import * as recurringService from '@/services/recurring.service';
import type { ActionResponse } from '@/types';

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function getRecurringAction() {
  const userId = await getUserId();
  return recurringService.getRecurringTransactions(userId);
}

export async function createRecurringAction(formData: FormData): Promise<ActionResponse> {
  const userId = await getUserId();
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
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await recurringService.createRecurringTransaction(userId, parsed.data);
  revalidatePath('/recurring');
  return { success: true, message: 'Recurring transaction created' };
}

export async function toggleRecurringAction(id: string): Promise<ActionResponse> {
  const userId = await getUserId();
  await recurringService.toggleRecurring(userId, id);
  revalidatePath('/recurring');
  return { success: true, message: 'Status toggled' };
}

export async function deleteRecurringAction(id: string): Promise<ActionResponse> {
  const userId = await getUserId();
  await recurringService.deleteRecurringTransaction(userId, id);
  revalidatePath('/recurring');
  return { success: true, message: 'Recurring transaction deleted' };
}
