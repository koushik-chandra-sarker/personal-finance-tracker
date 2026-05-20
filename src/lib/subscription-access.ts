import type { SubscriptionPlan, SubscriptionStatus, UserRole, UserStatus } from '@/types';

export type SubscriptionBlockReason = 'missing' | 'inactive' | 'expired' | 'invalid';

export type SubscriptionAccessUser = {
  role?: UserRole | string | null;
  status?: UserStatus | string | null;
  subscriptionPlan?: SubscriptionPlan | string | null;
  subscriptionStatus?: SubscriptionStatus | string | null;
  subscriptionCurrentPeriodEnd?: Date | string | null;
  pendingPaymentAccessUntil?: Date | string | null;
};

const SUBSCRIPTION_UNLOCKED_PATH_PREFIXES = ['/subscription', '/tutorials'];

export function isSubscriptionUnlockedPath(pathname: string) {
  return SUBSCRIPTION_UNLOCKED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function hasActiveSubscriptionAccess(user?: SubscriptionAccessUser | null) {
  if (!user) return false;
  if (user.status && user.status !== 'ACTIVE') return false;
  if (user.role === 'ADMIN') return true;
  if (user.pendingPaymentAccessUntil && new Date(user.pendingPaymentAccessUntil) >= new Date()) return true;
  if (user.subscriptionPlan !== 'PRO') return false;
  if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'TRIALING') return false;
  if (!user.subscriptionCurrentPeriodEnd) return true;

  return new Date(user.subscriptionCurrentPeriodEnd) >= new Date();
}

export function getSubscriptionBlockReason(user?: SubscriptionAccessUser | null): SubscriptionBlockReason {
  if (!user || user.subscriptionPlan !== 'PRO') return 'missing';
  if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'TRIALING') return 'inactive';
  if (user.subscriptionCurrentPeriodEnd && new Date(user.subscriptionCurrentPeriodEnd) < new Date()) return 'expired';
  return 'invalid';
}

export function getSubscriptionPageHref(reason: SubscriptionBlockReason, nextPath?: string | null) {
  const params = new URLSearchParams({ reason });
  if (nextPath && !nextPath.startsWith('/subscription')) {
    params.set('next', nextPath);
  }
  return `/subscription?${params.toString()}`;
}

export function getSubscriptionLockedHref(targetHref: string, user?: SubscriptionAccessUser | null) {
  if (!user || hasActiveSubscriptionAccess(user) || isSubscriptionUnlockedPath(targetHref)) {
    return targetHref;
  }

  return getSubscriptionPageHref(getSubscriptionBlockReason(user), targetHref);
}
