'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';
import type { SubscriptionInterval } from '@prisma/client';

export async function updateCurrencyAction(currency: string): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { currency },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true, message: 'Currency updated successfully' };
  } catch {
    return { success: false, message: 'Failed to update currency' };
  }
}

export async function updateSubscriptionAction(interval: SubscriptionInterval): Promise<ActionResponse<{
  subscriptionPlan: 'PRO';
  subscriptionInterval: SubscriptionInterval;
  subscriptionSource: 'SELF_SERVICE';
  subscriptionStatus: 'ACTIVE';
  subscriptionCurrentPeriodEnd: string;
  subscriptionCancelAtPeriodEnd: false;
}>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  if (interval !== 'MONTHLY' && interval !== 'YEARLY') {
    return { success: false, message: 'Invalid subscription interval' };
  }

  const now = new Date();
  const currentPeriodEnd = new Date(now);
  if (interval === 'YEARLY') {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  try {
    await prisma.userSubscription.upsert({
      where: { userId: session.user.id },
      update: {
        plan: 'PRO',
        interval,
        source: 'SELF_SERVICE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        userId: session.user.id,
        plan: 'PRO',
        interval,
        source: 'SELF_SERVICE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    revalidatePath('/settings');
    return {
      success: true,
      message: `Pro ${interval.toLowerCase()} subscription activated`,
      data: {
        subscriptionPlan: 'PRO',
        subscriptionInterval: interval,
        subscriptionSource: 'SELF_SERVICE',
        subscriptionStatus: 'ACTIVE',
        subscriptionCurrentPeriodEnd: currentPeriodEnd.toISOString(),
        subscriptionCancelAtPeriodEnd: false,
      },
    };
  } catch {
    return { success: false, message: 'Failed to update subscription' };
  }
}
