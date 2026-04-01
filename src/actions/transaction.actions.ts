'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { transactionSchema } from '@/lib/validations/transaction';
import * as transactionService from '@/services/transaction.service';
import type { ActionResponse } from '@/types';

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function getTransactionsAction(filters = {}) {
  const userId = await getUserId();
  return transactionService.getTransactions(userId, filters);
}

export async function createTransactionAction(formData: FormData): Promise<ActionResponse> {
  const userId = await getUserId();
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

  await transactionService.createTransaction(userId, parsed.data);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { success: true, message: 'Transaction created' };
}

export async function updateTransactionAction(id: string, formData: FormData): Promise<ActionResponse> {
  const userId = await getUserId();
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

  await transactionService.updateTransaction(userId, id, parsed.data);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { success: true, message: 'Transaction updated' };
}

export async function deleteTransactionAction(id: string): Promise<ActionResponse> {
  const userId = await getUserId();
  await transactionService.deleteTransaction(userId, id);
  revalidatePath('/dashboard');
  revalidatePath('/transactions');
  return { success: true, message: 'Transaction deleted' };
}
