'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { accountSchema } from '@/lib/validations/account';
import * as accountService from '@/services/account.service';
import type { ActionResponse } from '@/types';

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function getAccountsAction() {
  const userId = await getUserId();
  return accountService.getAccounts(userId);
}

export async function createAccountAction(formData: FormData): Promise<ActionResponse> {
  const userId = await getUserId();
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    balance: formData.get('balance') as string,
    currency: formData.get('currency') as string || 'USD',
    color: formData.get('color') as string || '#6366f1',
    icon: formData.get('icon') as string || 'wallet',
  };
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await accountService.createAccount(userId, parsed.data);
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true, message: 'Account created' };
}

export async function deleteAccountAction(id: string): Promise<ActionResponse> {
  const userId = await getUserId();
  await accountService.deleteAccount(userId, id);
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true, message: 'Account deactivated' };
}
