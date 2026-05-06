'use server';

import { createSanchayapatraConfig, updateSanchayapatraConfig, deleteSanchayapatraConfig } from '@/services/sanchayapatra-config.service';
import { revalidatePath } from 'next/cache';
import { validateAccess } from '@/lib/access';

function parseFormData(formData: FormData) {
  return {
    type: formData.get('type') as string,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    rate: parseFloat(formData.get('rate') as string),
    taxThreshold: parseFloat(formData.get('taxThreshold') as string),
    taxRateBelow: parseFloat(formData.get('taxRateBelow') as string),
    taxRateAbove: parseFloat(formData.get('taxRateAbove') as string),
    payoutFrequency: formData.get('payoutFrequency') as string,
  };
}

export async function createSanchayapatraConfigAction(formData: FormData) {
  try {
    await validateAccess('SETTINGS', 'EDIT');
    const data = parseFormData(formData);
    await createSanchayapatraConfig(data);
    revalidatePath('/admin/investments');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateSanchayapatraConfigAction(id: string, formData: FormData) {
  try {
    await validateAccess('SETTINGS', 'EDIT');
    const data = parseFormData(formData);
    await updateSanchayapatraConfig(id, data);
    revalidatePath('/admin/investments');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteSanchayapatraConfigAction(id: string) {
  try {
    await validateAccess('SETTINGS', 'EDIT');
    await deleteSanchayapatraConfig(id);
    revalidatePath('/admin/investments');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
