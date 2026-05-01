'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { transactionSchema } from '@/lib/validations/transaction';
import * as transactionService from '@/services/transaction.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
export async function getTransactionsAction(filters = {}) {
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');
  return transactionService.getTransactions(userId, filters);
}

export async function createTransactionAction(formData: FormData): Promise<ActionResponse> {
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
    date: formData.get('date') as string,
    tags: (formData.get('tags') as string)?.split(',').filter(Boolean) || [],
    notes: formData.get('notes') as string || undefined,
  };
  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await transactionService.createTransaction(userId, executorId, parsed.data);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { success: true, message: 'Transaction created' };
}

export async function updateTransactionAction(id: string, formData: FormData): Promise<ActionResponse> {
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
    date: formData.get('date') as string,
    tags: (formData.get('tags') as string)?.split(',').filter(Boolean) || [],
    notes: formData.get('notes') as string || undefined,
  };
  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await transactionService.updateTransaction(userId, executorId, id, parsed.data);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { success: true, message: 'Transaction updated' };
}

export async function deleteTransactionAction(id: string): Promise<ActionResponse> {
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'EDIT');
  await transactionService.deleteTransaction(userId, id);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/goals');
  return { success: true, message: 'Transaction deleted' };
}
