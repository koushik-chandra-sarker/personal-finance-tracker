'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { goalSchema, contributeSchema } from '@/lib/validations/goal';
import * as goalService from '@/services/goal.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
export async function getGoalsAction() {
  const userId = await getEffectiveUserId();
  await validateAccess('GOALS', 'VIEW');
  return goalService.getGoals(userId);
}

export async function createGoalAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('GOALS', 'EDIT');
  const raw = {
    name: formData.get('name') as string,
    targetAmount: formData.get('targetAmount') as string,
    deadline: formData.get('deadline') as string,
    color: formData.get('color') as string || '#10b981',
    icon: formData.get('icon') as string || 'target',
  };
  const parsed = goalSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await goalService.createGoal(userId, executorId, parsed.data);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  return { success: true, message: 'Goal created' };
}

export async function contributeToGoalAction(id: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('GOALS', 'EDIT');
  const raw = {
    accountId: formData.get('accountId') as string,
    amount: formData.get('amount') as string,
    description: formData.get('description') as string,
  };
  const parsed = contributeSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed' };

  await validateAccess('ACCOUNTS', 'EDIT');
  await validateAccess('TRANSACTIONS', 'EDIT');
  await goalService.contributeToGoal(userId, executorId, id, parsed.data.accountId, parsed.data.amount, raw.description);
  revalidatePath('/goals');
  revalidatePath('/accounts');
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { success: true, message: 'Contribution added' };
}

export async function deductFromGoalAction(id: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('GOALS', 'EDIT');
  const raw = {
    accountId: formData.get('accountId') as string,
    amount: formData.get('amount') as string,
    description: formData.get('description') as string,
  };
  const parsed = contributeSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed' };

  await validateAccess('ACCOUNTS', 'EDIT');
  await validateAccess('TRANSACTIONS', 'EDIT');
  await goalService.deductFromGoal(userId, executorId, id, parsed.data.accountId, parsed.data.amount, raw.description);
  revalidatePath('/goals');
  revalidatePath('/accounts');
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { success: true, message: 'Deduction added' };
}

export async function deleteGoalAction(id: string): Promise<ActionResponse> {
  const userId = await getEffectiveUserId();
  await validateAccess('GOALS', 'EDIT');
  await goalService.deleteGoal(userId, id);
  revalidatePath('/goals');
  return { success: true, message: 'Goal deleted' };
}
