'use server';

import { revalidatePath } from 'next/cache';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { salaryScenarioSchema, type SalaryScenarioInput } from '@/lib/validations/salary-scenario';
import * as salaryScenarioService from '@/services/salary-scenario.service';
import type { ActionResponse } from '@/types';
import type { SalaryScenarioRow } from '@/types/salary-planner';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function getSalaryScenariosAction(): Promise<SalaryScenarioRow[]> {
  const userId = await getEffectiveUserId();
  await validateAccess('SALARY_PLANNER', 'VIEW');
  return salaryScenarioService.getSalaryScenarios(userId);
}

export async function saveSalaryScenarioAction(
  payload: SalaryScenarioInput,
  id?: string,
): Promise<ActionResponse<SalaryScenarioRow>> {
  try {
    const userId = await getEffectiveUserId();
    await validateAccess('SALARY_PLANNER', 'EDIT');

    const parsed = salaryScenarioSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    const scenario = await salaryScenarioService.upsertSalaryScenario(userId, parsed.data, id);
    revalidatePath('/salary-planner');
    return { success: true, message: id ? 'Salary plan updated.' : 'Salary plan saved.', data: scenario };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to save salary plan.') };
  }
}

export async function deleteSalaryScenarioAction(id: string): Promise<ActionResponse> {
  try {
    const userId = await getEffectiveUserId();
    await validateAccess('SALARY_PLANNER', 'EDIT');
    await salaryScenarioService.deleteSalaryScenario(userId, id);
    revalidatePath('/salary-planner');
    return { success: true, message: 'Salary plan deleted.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to delete salary plan.') };
  }
}
