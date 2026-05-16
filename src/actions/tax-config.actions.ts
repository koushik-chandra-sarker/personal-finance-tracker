'use server';

import { getTaxConfigs, createTaxConfig, updateTaxConfig, deleteTaxConfig, syncTaxConfigsFromSource } from '@/services/tax-config.service';
import { revalidatePath } from 'next/cache';
import { validateAccess } from '@/lib/access';
import { TaxCategory } from '@prisma/client';

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

    await createTaxConfig(data);
    revalidatePath('/admin/tax-config');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
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
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteTaxConfigAction(id: string) {
  try {
    await validateAccess('SETTINGS', 'EDIT');
    await deleteTaxConfig(id);
    revalidatePath('/admin/tax-config');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function autoFetchTaxConfigsAction(fiscalYear: string) {
  try {
    await validateAccess('SETTINGS', 'EDIT');

    // Simulate fetching from NBR or another external source.
    // We will hardcode the logic for 2025-26 here as the "fetched" data.
    const fetchedData: any[] = [];
    
    if (fiscalYear === '2025-26') {
      const maleSlabs = [
        { minAmount: 0, maxAmount: 350000, rate: 0, label: 'Up to ৳3,50,000' },
        { minAmount: 350000, maxAmount: 450000, rate: 5, label: '৳3,50,001 – ৳4,50,000' },
        { minAmount: 450000, maxAmount: 750000, rate: 10, label: '৳4,50,001 – ৳7,50,000' },
        { minAmount: 750000, maxAmount: 1150000, rate: 15, label: '৳7,50,001 – ৳11,50,000' },
        { minAmount: 1150000, maxAmount: 1650000, rate: 20, label: '৳11,50,001 – ৳16,50,000' },
        { minAmount: 1650000, maxAmount: null, rate: 25, label: 'Above ৳16,50,000' },
      ];

      const femaleSlabs = [
        { minAmount: 0, maxAmount: 400000, rate: 0, label: 'Up to ৳4,00,000' },
        { minAmount: 400000, maxAmount: 500000, rate: 5, label: '৳4,00,001 – ৳5,00,000' },
        { minAmount: 500000, maxAmount: 800000, rate: 10, label: '৳5,00,001 – ৳8,00,000' },
        { minAmount: 800000, maxAmount: 1200000, rate: 15, label: '৳8,00,001 – ৳12,00,000' },
        { minAmount: 1200000, maxAmount: 1700000, rate: 20, label: '৳12,00,001 – ৳17,00,000' },
        { minAmount: 1700000, maxAmount: null, rate: 25, label: 'Above ৳17,00,000' },
      ];

      maleSlabs.forEach((slab, index) => {
        fetchedData.push({
          fiscalYear,
          category: 'MALE',
          slabIndex: index,
          ...slab,
          source: 'auto-fetched',
        });
      });

      femaleSlabs.forEach((slab, index) => {
        fetchedData.push({
          fiscalYear,
          category: 'FEMALE',
          slabIndex: index,
          ...slab,
          source: 'auto-fetched',
        });
      });
    } else {
      throw new Error(`Auto-fetch not available for fiscal year ${fiscalYear}`);
    }

    await syncTaxConfigsFromSource(fiscalYear, fetchedData);
    revalidatePath('/admin/tax-config');
    
    return { success: true, message: `Successfully fetched and updated tax slabs for ${fiscalYear}.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
