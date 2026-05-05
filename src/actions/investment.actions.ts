'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { investmentSchema, investmentReturnSchema } from '@/lib/validations/investment';
import * as investmentService from '@/services/investment.service';
import * as typeService from '@/services/investment-type.service';
import type { ActionResponse } from '@/types';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export async function getInvestmentsAction(filters?: {
  typeConfigId?: string;
  status?: string;
  search?: string;
}) {
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');
  return investmentService.getInvestments(userId, filters);
}

export async function getTypeConfigsAction() {
  const userId = await getEffectiveUserId();
  return typeService.getTypeConfigs(userId);
}

export async function createInvestmentAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'EDIT');

  const raw = {
    name: formData.get('name') as string,
    typeConfigId: formData.get('typeConfigId') as string,
    institutionName: formData.get('institutionName') as string,
    accountNumber: formData.get('accountNumber') as string,
    investedAmount: formData.get('investedAmount') as string,
    currentValue: formData.get('currentValue') as string,
    interestRate: formData.get('interestRate') as string || undefined,
    returnFrequency: formData.get('returnFrequency') as string || undefined,
    purchaseDate: formData.get('purchaseDate') as string,
    maturityDate: formData.get('maturityDate') as string || undefined,
    linkedAccountId: formData.get('linkedAccountId') as string || undefined,
    monthlyInstallment: formData.get('monthlyInstallment') as string || undefined,
    quantity: formData.get('quantity') as string || undefined,
    avgBuyPrice: formData.get('avgBuyPrice') as string || undefined,
    notes: formData.get('notes') as string || undefined,
    color: formData.get('color') as string || '#6366f1',
    icon: formData.get('icon') as string || 'trending-up',
  };

  const parsed = investmentSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };

  await investmentService.createInvestment(userId, executorId, parsed.data);
  revalidatePath('/investments');
  revalidatePath('/dashboard');
  return { success: true, message: 'Investment created' };
}

export async function updateInvestmentAction(id: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'EDIT');

  const data: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value !== '') data[key] = value;
  }
  // Coerce numeric fields
  if (data.investedAmount) data.investedAmount = Number(data.investedAmount);
  if (data.currentValue) data.currentValue = Number(data.currentValue);
  if (data.interestRate) data.interestRate = Number(data.interestRate);
  if (data.monthlyInstallment) data.monthlyInstallment = Number(data.monthlyInstallment);
  if (data.quantity) data.quantity = Number(data.quantity);
  if (data.avgBuyPrice) data.avgBuyPrice = Number(data.avgBuyPrice);

  await investmentService.updateInvestment(userId, executorId, id, data as Parameters<typeof investmentService.updateInvestment>[3]);
  revalidatePath('/investments');
  revalidatePath('/dashboard');
  return { success: true, message: 'Investment updated' };
}

export async function deleteInvestmentAction(id: string): Promise<ActionResponse> {
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'EDIT');
  await investmentService.deleteInvestment(userId, id);
  revalidatePath('/investments');
  return { success: true, message: 'Investment deleted' };
}

export async function recordReturnAction(investmentId: string, formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  const executorId = session.user.id;
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'EDIT');

  const raw = {
    amount: formData.get('amount') as string,
    type: formData.get('type') as string,
    description: formData.get('description') as string,
    date: formData.get('date') as string,
  };

  const parsed = investmentReturnSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: 'Validation failed' };

  await investmentService.recordReturn(userId, executorId, investmentId, parsed.data);
  revalidatePath('/investments');
  return { success: true, message: 'Return recorded' };
}

export async function getPortfolioSummaryAction() {
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');
  return investmentService.getPortfolioSummary(userId);
}

export async function getPortfolioAllocationAction() {
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');
  return investmentService.getPortfolioAllocation(userId);
}

export async function getUpcomingMaturitiesAction() {
  const userId = await getEffectiveUserId();
  await validateAccess('INVESTMENTS', 'VIEW');
  return investmentService.getUpcomingMaturities(userId);
}
