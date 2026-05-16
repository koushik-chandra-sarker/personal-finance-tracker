'use server';

import { getTaxConfigs, createTaxConfig, updateTaxConfig, deleteTaxConfig, syncTaxConfigsFromSource } from '@/services/tax-config.service';
import { revalidatePath } from 'next/cache';
import { validateAccess } from '@/lib/access';
import { TaxCategory } from '@prisma/client';
import { fetchBangladeshPersonalTaxConfigs } from '@/lib/tax-config-fetcher';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An error occurred.';
}

function serializeTaxConfig(config: Awaited<ReturnType<typeof getTaxConfigs>>[number]) {
  return {
    id: config.id,
    fiscalYear: config.fiscalYear,
    category: config.category,
    slabIndex: config.slabIndex,
    minAmount: config.minAmount.toString(),
    maxAmount: config.maxAmount?.toString() ?? null,
    rate: config.rate.toString(),
    label: config.label,
    isActive: config.isActive,
    source: config.source,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function fetchTaxConfigsAction(fiscalYear?: string) {
  await validateAccess('SETTINGS', 'VIEW');
  return getTaxConfigs(fiscalYear);
}

export async function createTaxConfigAction(formData: FormData) {
  try {
    await validateAccess('SETTINGS', 'EDIT');
    
    const data = {
      fiscalYear: formData.get('fiscalYear') as string,
      category: formData.get('category') as TaxCategory,
      slabIndex: parseInt(formData.get('slabIndex') as string, 10),
      minAmount: parseFloat(formData.get('minAmount') as string),
      maxAmount: formData.get('maxAmount') ? parseFloat(formData.get('maxAmount') as string) : null,
      rate: parseFloat(formData.get('rate') as string),
      label: formData.get('label') as string,
      source: 'manual',
    };

    const config = await createTaxConfig(data);
    revalidatePath('/admin/tax-config');
    revalidatePath('/salary-planner');
    return { success: true, data: serializeTaxConfig(config) };
  } catch (error) {
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function updateTaxConfigAction(id: string, formData: FormData) {
  try {
    await validateAccess('SETTINGS', 'EDIT');
    
    const data = {
      minAmount: parseFloat(formData.get('minAmount') as string),
      maxAmount: formData.get('maxAmount') ? parseFloat(formData.get('maxAmount') as string) : null,
      rate: parseFloat(formData.get('rate') as string),
      label: formData.get('label') as string,
      isActive: formData.get('isActive') === 'true',
    };

    await updateTaxConfig(id, data);
    revalidatePath('/admin/tax-config');
    return { success: true };
  } catch (error) {
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function deleteTaxConfigAction(id: string) {
  try {
    await validateAccess('SETTINGS', 'EDIT');
    await deleteTaxConfig(id);
    revalidatePath('/admin/tax-config');
    return { success: true };
  } catch (error) {
    return { success: false, message: getErrorMessage(error) };
  }
}

export async function autoFetchTaxConfigsAction(fiscalYear: string, sourceUrl?: string) {
  try {
    await validateAccess('SETTINGS', 'EDIT');

    const importResult = await fetchBangladeshPersonalTaxConfigs(fiscalYear, sourceUrl);
    await syncTaxConfigsFromSource(fiscalYear, importResult.configs);
    const configs = await getTaxConfigs();
    revalidatePath('/admin/tax-config');
    revalidatePath('/salary-planner');
    
    return {
      success: true,
      message: `Fetched ${importResult.configs.length} slabs for ${fiscalYear} from ${importResult.sourceTitle}.`,
      data: {
        configs: configs.map(serializeTaxConfig),
        sourceUrl: importResult.sourceUrl,
        sourceTitle: importResult.sourceTitle,
      },
    };
  } catch (error) {
    return { success: false, message: getErrorMessage(error) };
  }
}
