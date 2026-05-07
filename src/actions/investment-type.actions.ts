'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { investmentTypeConfigSchema } from '@/lib/validations/investment';
import * as typeService from '@/services/investment-type.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export async function getAllTypeConfigsAction() {
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');
  return typeService.getAllTypeConfigs(userId);
}

export async function createTypeConfigAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'EDIT');

  const returnTypesStr = formData.get('returnTypes') as string;
  const returnTypes = returnTypesStr ? returnTypesStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  const raw = {
    name: formData.get('name') as string,
    slug: formData.get('slug') as string,
    description: formData.get('description') as string,
    icon: formData.get('icon') as string || 'trending-up',
    color: formData.get('color') as string || '#6366f1',
    hasInterestRate: formData.get('hasInterestRate') === 'true',
    hasReturnFrequency: formData.get('hasReturnFrequency') === 'true',
    hasMaturityDate: formData.get('hasMaturityDate') === 'true',
    hasMonthlyInstallment: formData.get('hasMonthlyInstallment') === 'true',
    hasQuantity: formData.get('hasQuantity') === 'true',
    hasInstitution: formData.get('hasInstitution') === 'true',
    hasAccountNumber: formData.get('hasAccountNumber') === 'true',
    returnTypes,
  };

  const parsed = investmentTypeConfigSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await typeService.createTypeConfig(userId, parsed.data);
  revalidatePath('/investments/types');
  return { success: true, message: 'Investment type created' };
}

export async function updateTypeConfigAction(id: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'EDIT');

  const isSystem = formData.get('isSystem') === 'true';
  const isActive = formData.get('isActive') === 'true';

  if (isSystem) {
    await typeService.updateTypeConfig(userId, id, { isActive });
  } else {
    const returnTypesStr = formData.get('returnTypes') as string;
    const returnTypes = returnTypesStr ? returnTypesStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    await typeService.updateTypeConfig(userId, id, {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      icon: formData.get('icon') as string || 'trending-up',
      color: formData.get('color') as string || '#6366f1',
      hasInterestRate: formData.get('hasInterestRate') === 'true',
      hasReturnFrequency: formData.get('hasReturnFrequency') === 'true',
      hasMaturityDate: formData.get('hasMaturityDate') === 'true',
      hasMonthlyInstallment: formData.get('hasMonthlyInstallment') === 'true',
      hasQuantity: formData.get('hasQuantity') === 'true',
      hasInstitution: formData.get('hasInstitution') === 'true',
      hasAccountNumber: formData.get('hasAccountNumber') === 'true',
      isActive,
      returnTypes,
    });
  }

  revalidatePath('/investments/types');
  return { success: true, message: 'Investment type updated' };
}

export async function deleteTypeConfigAction(id: string): Promise<ActionResponse> {
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'EDIT');
  
  try {
    await typeService.deleteTypeConfig(userId, id);
    revalidatePath('/investments/types');
    return { success: true, message: 'Investment type deleted' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete investment type' };
  }
}
