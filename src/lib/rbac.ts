import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { SubscriptionPlan, UserRole } from '@prisma/client';
import { hasActiveSubscriptionAccess } from '@/lib/subscription-access';
import { getPendingPaymentAccessState } from '@/lib/pending-payment-access';

const ROLE_RANK: Record<UserRole, number> = {
  USER: 1,
  ADMIN: 2,
};

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
};

export async function getCurrentUserAccess() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      status: true,
      lockedUntil: true,
      subscription: {
        select: {
          packageId: true,
          plan: true,
          interval: true,
          source: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
      manualPaymentRequests: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          createdAt: true,
          package: { select: { name: true } },
        },
      },
    },
  });

  if (!user) throw new Error('Unauthorized');
  if (user.status !== 'ACTIVE') throw new Error('Account is not active.');
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new Error('Account is temporarily locked.');
  const pendingPaymentAccess = getPendingPaymentAccessState(user.manualPaymentRequests[0] || null);
  return {
    id: user.id,
    role: user.role,
    status: user.status,
    subscriptionPackageId: user.subscription?.packageId || null,
    subscriptionPlan: user.subscription?.plan || null,
    subscriptionInterval: user.subscription?.interval || null,
    subscriptionSource: user.subscription?.source || null,
    subscriptionStatus: user.subscription?.status || 'ACTIVE',
    subscriptionCurrentPeriodStart: user.subscription?.currentPeriodStart || null,
    subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd || null,
    subscriptionCancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || false,
    pendingPaymentRequestId: pendingPaymentAccess.request?.id || null,
    pendingPaymentPackageName: pendingPaymentAccess.request?.package?.name || null,
    pendingPaymentAccessUntil: pendingPaymentAccess.accessUntil,
    pendingPaymentAccessActive: pendingPaymentAccess.isActive,
    pendingPaymentAccessHours: pendingPaymentAccess.hours,
  };
}

export async function requireRole(requiredRole: UserRole): Promise<void> {
  const user = await getCurrentUserAccess();
  if (ROLE_RANK[user.role] < ROLE_RANK[requiredRole]) {
    throw new Error(`You need ${requiredRole} access to perform this action.`);
  }
}

export async function requireSubscriptionPlan(userId: string, requiredPlan: SubscriptionPlan): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      lockedUntil: true,
      subscription: {
        select: { plan: true, status: true, currentPeriodEnd: true },
      },
      manualPaymentRequests: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, createdAt: true },
      },
    },
  });

  if (!user) throw new Error('Unauthorized');
  if (user.status !== 'ACTIVE') throw new Error('Account is not active.');
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new Error('Account is temporarily locked.');
  if (user.role === 'ADMIN') return;
  if (getPendingPaymentAccessState(user.manualPaymentRequests[0] || null).isActive) return;

  const plan = user.subscription?.plan || null;
  const status = user.subscription?.status || 'ACTIVE';
  const hasPlan = plan ? PLAN_RANK[plan] >= PLAN_RANK[requiredPlan] : false;
  const isActive = status === 'ACTIVE' || status === 'TRIALING';
  const isExpired = user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd < new Date() : false;

  if (!hasPlan || !isActive || isExpired) {
    throw new Error(`${requiredPlan} subscription required for this feature.`);
  }
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      lockedUntil: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
      manualPaymentRequests: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, createdAt: true },
      },
    },
  });

  if (!user) return false;
  if (user.status !== 'ACTIVE') return false;
  if (user.lockedUntil && user.lockedUntil > new Date()) return false;
  if (user.role === 'ADMIN') return true;
  const pendingPaymentAccess = getPendingPaymentAccessState(user.manualPaymentRequests[0] || null);
  return hasActiveSubscriptionAccess({
    role: user.role,
    status: user.status,
    subscriptionPlan: user.subscription?.plan || null,
    subscriptionStatus: user.subscription?.status || null,
    subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd || null,
    pendingPaymentAccessUntil: pendingPaymentAccess.accessUntil,
  });
}
