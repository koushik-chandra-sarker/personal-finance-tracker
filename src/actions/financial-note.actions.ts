'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { financialNoteSchema } from '@/lib/validations/financial-note';
import * as financialNoteService from '@/services/financial-note.service';
import type { ActionResponse, FinancialNoteFilters } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

function parseTags(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.split(',').map(tag => tag.trim()).filter(Boolean) : [];
}

function readFinancialNoteFormData(formData: FormData) {
  return {
    mode: formData.get('mode') as string || 'SIMPLE',
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    tags: parseTags(formData.get('tags')),
    counterpartyName: formData.get('counterpartyName') as string,
    valueType: formData.get('valueType') as string || undefined,
    amount: formData.get('amount') as string,
    assetName: formData.get('assetName') as string,
    assetDetails: formData.get('assetDetails') as string,
    providedDate: formData.get('providedDate') as string,
    expectedReturnDate: formData.get('expectedReturnDate') as string,
    returnedDate: formData.get('returnedDate') as string,
    status: formData.get('status') as string || undefined,
  };
}

export async function getFinancialNotesAction(filters: FinancialNoteFilters = {}) {
  const userId = await getEffectiveUserId();
  await validateAccess('NOTES', 'VIEW');
  return financialNoteService.getFinancialNotes(userId, filters);
}

export async function createFinancialNoteAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const executorId = session.user.id;
    const userId = await getEffectiveUserId();
    await validateAccess('NOTES', 'EDIT');

    const parsed = financialNoteSchema.safeParse(readFinancialNoteFormData(formData));
    if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

    await financialNoteService.createFinancialNote(userId, executorId, parsed.data);
    revalidatePath('/notes');
    return { success: true, message: 'নোট তৈরি হয়েছে' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'নোট তৈরি করা যায়নি' };
  }
}

export async function updateFinancialNoteAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const executorId = session.user.id;
    const userId = await getEffectiveUserId();
    await validateAccess('NOTES', 'EDIT');

    const parsed = financialNoteSchema.safeParse(readFinancialNoteFormData(formData));
    if (!parsed.success) return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };

    await financialNoteService.updateFinancialNote(userId, executorId, id, parsed.data);
    revalidatePath('/notes');
    return { success: true, message: 'নোট আপডেট হয়েছে' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'নোট আপডেট করা যায়নি' };
  }
}

export async function deleteFinancialNoteAction(id: string): Promise<ActionResponse> {
  try {
    const userId = await getEffectiveUserId();
    await validateAccess('NOTES', 'EDIT');
    await financialNoteService.deleteFinancialNote(userId, id);
    revalidatePath('/notes');
    return { success: true, message: 'নোট ডিলিট হয়েছে' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'নোট ডিলিট করা যায়নি' };
  }
}
