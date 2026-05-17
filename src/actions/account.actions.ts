'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { accountSchema } from '@/lib/validations/account';
import * as accountService from '@/services/account.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
export async function getAccountsAction() {
  const userId = await getEffectiveUserId();
  await validateAccess('ACCOUNTS', 'VIEW');
  return accountService.getAccounts(userId);
}

export async function createAccountAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('ACCOUNTS', 'EDIT');
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    balance: formData.get('balance') as string,
    color: formData.get('color') as string || '#6366f1',
    icon: formData.get('icon') as string || 'wallet',
  };
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

  await accountService.createAccount(userId, executorId, parsed.data);
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true, message: 'অ্যাকাউন্ট তৈরি হয়েছে' };
}

export async function deleteAccountAction(id: string): Promise<ActionResponse> {
  const userId = await getEffectiveUserId();
  await validateAccess('ACCOUNTS', 'EDIT');
  await accountService.deleteAccount(userId, id);
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true, message: 'অ্যাকাউন্ট নিষ্ক্রিয় হয়েছে' };
}

export async function updateAccountAction(id: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('ACCOUNTS', 'EDIT');
  const raw = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    color: formData.get('color') as string || '#6366f1',
    icon: formData.get('icon') as string || 'wallet',
    balance: 0, // Not used in update but required by schema
  };
  const parsed = accountSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

  await accountService.updateAccount(userId, executorId, id, {
    name: parsed.data.name,
    type: parsed.data.type as any,
    color: parsed.data.color,
    icon: parsed.data.icon,
  });
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return { success: true, message: 'অ্যাকাউন্ট আপডেট হয়েছে' };
}
