'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';
import type { SubscriptionInterval } from '@prisma/client';
import { requireRole } from '@/lib/rbac';

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

export async function grantUserAccessAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    await requireRole('ADMIN');
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Admin access required' };
  }

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const duration = String(formData.get('duration') || '');
  if (!email) return { success: false, message: 'User email is required' };
  if (!['MONTHLY', 'YEARLY', 'UNLIMITED'].includes(duration)) {
    return { success: false, message: 'Invalid grant duration' };
  }

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return { success: false, message: 'User not found' };

  const now = new Date();
  let currentPeriodEnd: Date | null = null;
  let interval: SubscriptionInterval | null = null;

  if (duration === 'MONTHLY') {
    currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    interval = 'MONTHLY';
  } else if (duration === 'YEARLY') {
    currentPeriodEnd = new Date(now);
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    interval = 'YEARLY';
  }

  try {
    await prisma.userSubscription.upsert({
      where: { userId: targetUser.id },
      update: {
        plan: 'PRO',
        interval,
        source: 'ADMIN_GRANT',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        grantedById: session.user.id,
      },
      create: {
        userId: targetUser.id,
        plan: 'PRO',
        interval,
        source: 'ADMIN_GRANT',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        grantedById: session.user.id,
      },
    });

    revalidatePath('/settings');
    return {
      success: true,
      message: currentPeriodEnd
        ? `Full access granted to ${targetUser.email} until ${currentPeriodEnd.toLocaleDateString()}`
        : `Unlimited full access granted to ${targetUser.email}`,
    };
  } catch {
    return { success: false, message: 'Failed to grant access' };
  }
}

export async function revokeUserAccessAction(email: string): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    await requireRole('ADMIN');
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return { success: false, message: 'User not found' };

    await prisma.userSubscription.deleteMany({ where: { userId: targetUser.id } });
    revalidatePath('/settings');
    return { success: true, message: `Access revoked for ${targetUser.email}` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to revoke access' };
  }
}

export async function getSubscriptionUsersAction(): Promise<Array<{
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  subscription: {
    source: 'SELF_SERVICE' | 'ADMIN_GRANT';
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
    interval: SubscriptionInterval | null;
    currentPeriodEnd: string | null;
  } | null;
}>> {
  await requireRole('ADMIN');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      subscription: {
        select: {
          source: true,
          status: true,
          interval: true,
          currentPeriodEnd: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return users.map((user) => ({
    ...user,
    subscription: user.subscription
      ? {
          ...user.subscription,
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() || null,
        }
      : null,
  }));
}
