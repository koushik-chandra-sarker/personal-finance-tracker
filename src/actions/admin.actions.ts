'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import type { ActionResponse } from '@/types';
import type { SubscriptionInterval, UserRole } from '@prisma/client';

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  subscription: {
    source: 'SELF_SERVICE' | 'ADMIN_GRANT';
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
    interval: SubscriptionInterval | null;
    currentPeriodEnd: string | null;
  } | null;
};

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  subscription: {
    source: 'SELF_SERVICE' | 'ADMIN_GRANT';
    status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
    interval: SubscriptionInterval | null;
    currentPeriodEnd: Date | null;
  } | null;
}): AdminUserRow {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    subscription: user.subscription
      ? {
          ...user.subscription,
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() || null,
        }
      : null,
  };
}

export async function getAdminUsersAction(): Promise<AdminUserRow[]> {
  await requireRole('ADMIN');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
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
    take: 100,
  });

  return users.map(serializeUser);
}

export async function updateUserRoleAction(userId: string, role: UserRole): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
  await requireRole('ADMIN');

  if (role !== 'ADMIN' && role !== 'USER') {
    return { success: false, message: 'Invalid role' };
  }

  if (userId === session.user.id && role !== 'ADMIN') {
    return { success: false, message: 'You cannot remove your own admin role.' };
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!targetUser) return { success: false, message: 'User not found' };
  if (targetUser.role === 'ADMIN' && role !== 'ADMIN' && adminCount <= 1) {
    return { success: false, message: 'At least one admin is required.' };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath('/admin/users');
  return { success: true, message: 'User role updated' };
}

export async function grantUserAccessAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };
  await requireRole('ADMIN');

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

  revalidatePath('/admin/subscriptions');
  return {
    success: true,
    message: currentPeriodEnd
      ? `Full access granted to ${targetUser.email} until ${currentPeriodEnd.toLocaleDateString()}`
      : `Unlimited full access granted to ${targetUser.email}`,
  };
}

export async function revokeUserAccessAction(userId: string): Promise<ActionResponse> {
  await requireRole('ADMIN');

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!targetUser) return { success: false, message: 'User not found' };
  if (targetUser.role === 'ADMIN') return { success: false, message: 'Admin access cannot be revoked here.' };

  await prisma.userSubscription.deleteMany({ where: { userId } });
  revalidatePath('/admin/subscriptions');
  return { success: true, message: `Access revoked for ${targetUser.email}` };
}
