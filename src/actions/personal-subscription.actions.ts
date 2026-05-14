'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { hasActiveSubscription } from '@/lib/rbac';
import { personalSubscriptionSchema } from '@/lib/validations/personal-subscription';
import * as subscriptionService from '@/services/personal-subscription.service';
import type { ActionResponse } from '@/types';

function firstString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parseFormData(formData: FormData) {
  return personalSubscriptionSchema.safeParse({
    name: firstString(formData.get('name')),
    provider: firstString(formData.get('provider')),
    planName: firstString(formData.get('planName')),
    accountId: firstString(formData.get('accountId')),
    categoryId: firstString(formData.get('categoryId')),
    amount: firstString(formData.get('amount')),
    currency: firstString(formData.get('currency')) || 'USD',
    billingCycle: firstString(formData.get('billingCycle')) || 'MONTHLY',
    nextBillingDate: firstString(formData.get('nextBillingDate')),
    status: firstString(formData.get('status')) || 'ACTIVE',
    autoRenew: formData.get('autoRenew') === 'on' || formData.get('autoRenew') === 'true',
    reminderDays: firstString(formData.get('reminderDays')) || '3',
    websiteUrl: firstString(formData.get('websiteUrl')),
    notes: firstString(formData.get('notes')),
    color: firstString(formData.get('color')) || '#6366f1',
  });
}

export async function createPersonalSubscriptionAction(formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = await getEffectiveUserId();
    await validateAccess('SUBSCRIPTIONS', 'EDIT');

    const parsed = parseFormData(formData);
    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    await subscriptionService.createPersonalSubscription(userId, session.user.id, parsed.data);
    revalidatePath('/service-tracker');
    return { success: true, message: 'Subscription added.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to add subscription.') };
  }
}

export async function updatePersonalSubscriptionAction(id: string, formData: FormData): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = await getEffectiveUserId();
    await validateAccess('SUBSCRIPTIONS', 'EDIT');

    const parsed = parseFormData(formData);
    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    await subscriptionService.updatePersonalSubscription(userId, session.user.id, id, parsed.data);
    revalidatePath('/service-tracker');
    return { success: true, message: 'Subscription updated.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to update subscription.') };
  }
}

export async function togglePersonalSubscriptionAction(id: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = await getEffectiveUserId();
    await validateAccess('SUBSCRIPTIONS', 'EDIT');

    await subscriptionService.togglePersonalSubscriptionStatus(userId, session.user.id, id);
    revalidatePath('/service-tracker');
    return { success: true, message: 'Subscription status updated.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to update status.') };
  }
}

export async function deletePersonalSubscriptionAction(id: string): Promise<ActionResponse> {
  try {
    const userId = await getEffectiveUserId();
    await validateAccess('SUBSCRIPTIONS', 'EDIT');
    await subscriptionService.deletePersonalSubscription(userId, id);
    revalidatePath('/service-tracker');
    return { success: true, message: 'Subscription deleted.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to delete subscription.') };
  }
}

export async function processDuePersonalSubscriptionsAction(): Promise<{ success: boolean; processed: number }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, processed: 0 };
    if (!(await hasActiveSubscription(session.user.id))) return { success: false, processed: 0 };

    const userId = await getEffectiveUserId();
    await validateAccess('TRANSACTIONS', 'EDIT');
    await validateAccess('SUBSCRIPTIONS', 'EDIT');

    const processed = await subscriptionService.processDuePersonalSubscriptions({
      userId,
      executorId: session.user.id,
    });

    if (processed > 0) {
      revalidatePath('/dashboard');
      revalidatePath('/transactions');
      revalidatePath('/accounts');
      revalidatePath('/reports');
      revalidatePath('/service-tracker');
    }

    return { success: true, processed };
  } catch (error) {
    console.error('Failed to process subscription payments:', error);
    return { success: false, processed: 0 };
  }
}
