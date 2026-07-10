'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { budgetSchema } from '@/lib/validations/budget';
import * as budgetService from '@/services/budget.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { getFinancialMonthStartDay } from '@/services/financial-period.service';
export async function getBudgetsAction(month: number, year: number) {
  const userId = await getEffectiveUserId();
  await validateAccess('BUDGETS', 'VIEW');
  const financialMonthStartDay = await getFinancialMonthStartDay(userId);
  return budgetService.getBudgets(userId, month, year, financialMonthStartDay);
}

export async function createBudgetAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('BUDGETS', 'EDIT');
  const raw = {
    categoryId: formData.get('categoryId') as string,
    amount: formData.get('amount') as string,
    rolloverEnabled: formData.get('rolloverEnabled') ?? 'false',
    month: formData.get('month') as string,
    year: formData.get('year') as string,
  };
  const parsed = budgetSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

  await budgetService.createOrUpdateBudget(userId, executorId, parsed.data);
  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { success: true, message: 'বাজেট সেভ হয়েছে' };
}

export async function deleteBudgetAction(id: string): Promise<ActionResponse> {
  const userId = await getEffectiveUserId();
  await validateAccess('BUDGETS', 'EDIT');
  await budgetService.deleteBudget(userId, id);
  revalidatePath('/budgets');
  revalidatePath('/dashboard');
  return { success: true, message: 'বাজেট ডিলিট হয়েছে' };
}
