'use server';

import { getTaxConfigs, createTaxConfig, updateTaxConfig, deleteTaxConfig, replaceTaxConfigsForFiscalYear } from '@/services/tax-config.service';
import { revalidatePath } from 'next/cache';
import { validateAccess } from '@/lib/access';
import { TaxCategory } from '@prisma/client';

export type ManualTaxConfigInput = {
  category: TaxCategory;
  slabIndex: number;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  label: string;
};

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
    revalidatePath('/tax-calculator');
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
    revalidatePath('/salary-planner');
    revalidatePath('/tax-calculator');
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
    revalidatePath('/salary-planner');
    revalidatePath('/tax-calculator');
    return { success: true };
  } catch (error) {
    return { success: false, message: getErrorMessage(error) };
  }
}

function validateManualTaxRows(fiscalYear: string, rows: ManualTaxConfigInput[]) {
  const cleanFiscalYear = fiscalYear.trim();
  if (!/^\d{4}-\d{2}$/.test(cleanFiscalYear)) {
    throw new Error('Use fiscal year format like 2025-26.');
  }
  if (rows.length === 0) {
    throw new Error('Add at least one tax slab.');
  }

  return rows.map((row, index) => {
    if (!row.label.trim()) throw new Error(`Row ${index + 1}: label is required.`);
    if (!['MALE', 'FEMALE'].includes(row.category)) throw new Error(`Row ${index + 1}: category is invalid.`);
    if (!Number.isFinite(row.minAmount) || row.minAmount < 0) throw new Error(`Row ${index + 1}: min amount is invalid.`);
    if (row.maxAmount !== null && (!Number.isFinite(row.maxAmount) || row.maxAmount <= row.minAmount)) {
      throw new Error(`Row ${index + 1}: max amount must be greater than min amount.`);
    }
    if (!Number.isFinite(row.rate) || row.rate < 0 || row.rate > 100) throw new Error(`Row ${index + 1}: rate must be between 0 and 100.`);

    return {
      fiscalYear: cleanFiscalYear,
      category: row.category,
      slabIndex: row.slabIndex,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      rate: row.rate,
      label: row.label.trim(),
      source: 'manual',
      isActive: true,
    };
  });
}

export async function saveManualTaxYearConfigsAction(fiscalYear: string, rows: ManualTaxConfigInput[]) {
  try {
    await validateAccess('SETTINGS', 'EDIT');

    const data = validateManualTaxRows(fiscalYear, rows);
    await replaceTaxConfigsForFiscalYear(fiscalYear.trim(), data);
    const configs = await getTaxConfigs();
    revalidatePath('/admin/tax-config');
    revalidatePath('/salary-planner');
    revalidatePath('/tax-calculator');
    
    return {
      success: true,
      message: `Saved ${data.length} manual tax slabs for ${fiscalYear.trim()}.`,
      data: {
        configs: configs.map(serializeTaxConfig),
      },
    };
  } catch (error) {
    return { success: false, message: getErrorMessage(error) };
  }
}
