'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { goalSchema, contributeSchema } from '@/lib/validations/goal';
import * as goalService from '@/services/goal.service';
import type { ActionResponse } from '@/types';

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function getGoalsAction() {
  const userId = await getUserId();
  return goalService.getGoals(userId);
}

export async function createGoalAction(formData: FormData): Promise<ActionResponse> {
  const userId = await getUserId();
  const raw = {
    name: formData.get('name') as string,
    targetAmount: formData.get('targetAmount') as string,
    deadline: formData.get('deadline') as string,
    color: formData.get('color') as string || '#10b981',
    icon: formData.get('icon') as string || 'target',
  };
  const parsed = goalSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await goalService.createGoal(userId, parsed.data);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  return { success: true, message: 'Goal created' };
}

export async function contributeToGoalAction(id: string, formData: FormData): Promise<ActionResponse> {
  const userId = await getUserId();
  const raw = { amount: formData.get('amount') as string };
  const parsed = contributeSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed' };

  await goalService.contributeToGoal(userId, id, parsed.data.amount);
  revalidatePath('/goals');
  revalidatePath('/dashboard');
  return { success: true, message: 'Contribution added' };
}

export async function deleteGoalAction(id: string): Promise<ActionResponse> {
  const userId = await getUserId();
  await goalService.deleteGoal(userId, id);
  revalidatePath('/goals');
  return { success: true, message: 'Goal deleted' };
}
