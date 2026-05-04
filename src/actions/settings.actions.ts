'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';
import type { SubscriptionInterval } from '@prisma/client';

export type SubscriptionPackageRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  currency: string;
  price: number;
  interval: SubscriptionInterval;
  trialDays: number;
  discountLabel: string | null;
  featureBullets: string[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

function serializePackage(pkg: {
  id: string;
  slug: string;
  name: string;
  description: string;
  currency: string;
  price: unknown;
  interval: SubscriptionInterval;
  trialDays: number;
  discountLabel: string | null;
  featureBullets: string[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}): SubscriptionPackageRow {
  return {
    ...pkg,
    price: Number(pkg.price),
  };
}

export async function getActiveSubscriptionPackagesAction(): Promise<SubscriptionPackageRow[]> {
  const packages = await prisma.subscriptionPackage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'asc' }],
  });

  return packages.map(serializePackage);
}

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

export async function updateSubscriptionAction(packageId: string): Promise<ActionResponse<{
  subscriptionPlan: 'PRO';
  subscriptionInterval: SubscriptionInterval;
  subscriptionPackageId: string;
  subscriptionSource: 'SELF_SERVICE';
  subscriptionStatus: 'ACTIVE';
  subscriptionCurrentPeriodEnd: string;
  subscriptionCancelAtPeriodEnd: false;
}>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const subscriptionPackage = await prisma.subscriptionPackage.findFirst({
    where: { id: packageId, isActive: true },
  });
  if (!subscriptionPackage) return { success: false, message: 'Subscription package is not available' };

  const now = new Date();
  const currentPeriodEnd = new Date(now);
  if (subscriptionPackage.interval === 'YEARLY') {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  } else {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  try {
    await prisma.userSubscription.upsert({
      where: { userId: session.user.id },
      update: {
        packageId: subscriptionPackage.id,
        plan: 'PRO',
        interval: subscriptionPackage.interval,
        source: 'SELF_SERVICE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        userId: session.user.id,
        packageId: subscriptionPackage.id,
        plan: 'PRO',
        interval: subscriptionPackage.interval,
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
      message: `${subscriptionPackage.name} activated`,
      data: {
        subscriptionPlan: 'PRO',
        subscriptionInterval: subscriptionPackage.interval,
        subscriptionPackageId: subscriptionPackage.id,
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
