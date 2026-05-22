'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResponse, UserExperienceMode } from '@/types';
import type { ManualPaymentProvider, ManualPaymentStatus, SubscriptionInterval } from '@prisma/client';
import { createNotification } from '@/services/notification.service';
import { hasActiveSubscriptionAccess } from '@/lib/subscription-access';
import { getPendingPaymentAccessHours } from '@/lib/pending-payment-access';
import { clearUserWorkspaceData, getDeletedUserEmail } from '@/lib/user-data-cleanup';
import { normalizeLocale, type AppLocale } from '@/i18n/config';
import { setLocaleCookie } from '@/i18n/server';

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

export type ManualPaymentMethodRow = {
  id: string;
  provider: ManualPaymentProvider;
  label: string;
  accountNumber: string;
  accountName: string;
  instructions: string | null;
};

export type ManualPaymentRequestRow = {
  id: string;
  provider: ManualPaymentProvider;
  status: ManualPaymentStatus;
  amount: number;
  currency: string;
  reference: string;
  senderAccount: string;
  transactionId: string;
  paidAt: string | null;
  screenshotUrl: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  package: {
    id: string;
    name: string;
    interval: SubscriptionInterval;
  };
  method: {
    label: string;
    accountNumber: string;
  } | null;
};

function isTrialPackage(pkg: { price: unknown; trialDays: number }) {
  return Number(pkg.price) === 0 && pkg.trialDays > 0;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

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

function serializeManualPaymentMethod(method: {
  id: string;
  provider: ManualPaymentProvider;
  label: string;
  accountNumber: string;
  accountName: string;
  instructions: string | null;
}): ManualPaymentMethodRow {
  return method;
}

function serializeManualPaymentRequest(request: {
  id: string;
  provider: ManualPaymentProvider;
  status: ManualPaymentStatus;
  amount: unknown;
  currency: string;
  reference: string;
  senderAccount: string;
  transactionId: string;
  paidAt: Date | null;
  screenshotUrl: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  package: {
    id: string;
    name: string;
    interval: SubscriptionInterval;
  };
  method: {
    label: string;
    accountNumber: string;
  } | null;
}): ManualPaymentRequestRow {
  return {
    ...request,
    amount: Number(request.amount),
    paidAt: request.paidAt?.toISOString() || null,
    createdAt: request.createdAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() || null,
  };
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidScreenshotUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function notifyAdminsOfManualPaymentRequest(input: {
  paymentRequestId: string;
  senderId: string;
  senderName: string;
  packageName: string;
  amount: number;
  currency: string;
  provider: ManualPaymentProvider;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
        id: { not: input.senderId },
      },
      select: { id: true },
      take: 50,
    });

    await Promise.all(admins.map((admin) => createNotification(admin.id, {
      title: 'New manual payment submitted',
      message: `${input.senderName} submitted ${formatAdminPaymentAmount(input.amount, input.currency)} for ${input.packageName} via ${input.provider === 'BKASH' ? 'bKash' : 'Nagad'}.`,
      type: 'SYSTEM',
      severity: 'INFO',
      sourceType: 'SYSTEM',
      sourceId: input.paymentRequestId,
      actionUrl: '/admin/payments',
    })));
  } catch (error) {
    console.error('Failed to notify admins about manual payment request:', error);
  }
}

function formatAdminPaymentAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export async function getActiveSubscriptionPackagesAction(): Promise<SubscriptionPackageRow[]> {
  const packages = await prisma.subscriptionPackage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'asc' }],
  });

  return packages.map(serializePackage);
}

export async function getActiveManualPaymentMethodsAction(): Promise<ManualPaymentMethodRow[]> {
  const methods = await prisma.manualPaymentMethod.findMany({
    where: { isActive: true },
    select: {
      id: true,
      provider: true,
      label: true,
      accountNumber: true,
      accountName: true,
      instructions: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return methods.map(serializeManualPaymentMethod);
}

export async function getMyManualPaymentRequestsAction(): Promise<ManualPaymentRequestRow[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const requests = await prisma.manualPaymentRequest.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      status: true,
      amount: true,
      currency: true,
      reference: true,
      senderAccount: true,
      transactionId: true,
      paidAt: true,
      screenshotUrl: true,
      note: true,
      adminNote: true,
      createdAt: true,
      reviewedAt: true,
      package: {
        select: { id: true, name: true, interval: true },
      },
      method: {
        select: { label: true, accountNumber: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return requests.map(serializeManualPaymentRequest);
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

export async function updateLocaleAction(locale: string): Promise<ActionResponse<{ preferredLocale: AppLocale }>> {
  const preferredLocale = normalizeLocale(locale);
  const session = await auth();

  try {
    await setLocaleCookie(preferredLocale);

    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { preferredLocale },
      });
    }

    revalidatePath('/');
    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true, message: 'Language updated', data: { preferredLocale } };
  } catch {
    return { success: false, message: 'Failed to update language' };
  }
}

export async function updateExperienceModeAction(experienceMode: string): Promise<ActionResponse<{ experienceMode: UserExperienceMode }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const normalizedMode = experienceMode === 'BASIC' ? 'BASIC' : experienceMode === 'FULL' ? 'FULL' : null;
  if (!normalizedMode) return { success: false, message: 'Choose Basic or Full experience mode.' };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { experienceMode: normalizedMode },
    });

    revalidatePath('/dashboard');
    revalidatePath('/settings');
    return {
      success: true,
      message: normalizedMode === 'BASIC' ? 'Basic mode enabled.' : 'Full mode enabled.',
      data: { experienceMode: normalizedMode },
    };
  } catch {
    return { success: false, message: 'Failed to update experience mode.' };
  }
}

export async function clearMyDataAction(formData: FormData): Promise<ActionResponse<{ recreateStarterData: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const confirmation = String(formData.get('confirmation') || '').trim().toUpperCase();
  if (confirmation !== 'CLEAR') {
    return { success: false, message: 'Type CLEAR to confirm data reset.' };
  }

  const recreateStarterData = formData.get('recreateStarterData') === 'on';
  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      await clearUserWorkspaceData(tx, userId, { recreateStarterData });
    }, { timeout: 30000 });

    revalidatePath('/dashboard');
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/budgets');
    revalidatePath('/goals');
    revalidatePath('/categories');
    revalidatePath('/recurring');
    revalidatePath('/reports');
    revalidatePath('/service-tracker');
    revalidatePath('/investments');
    revalidatePath('/notes');
    revalidatePath('/salary-planner');
    revalidatePath('/settings');

    return {
      success: true,
      message: recreateStarterData
        ? 'Your data was cleared. Starter categories and a Cash account were recreated.'
        : 'Your data was cleared. You can now build everything from a blank workspace.',
      data: { recreateStarterData },
    };
  } catch (error) {
    console.error('Failed to clear user data:', error);
    return { success: false, message: 'Failed to clear data. Please try again.' };
  }
}

export async function deleteMyAccountAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const confirmation = String(formData.get('confirmation') || '').trim().toUpperCase();
  if (confirmation !== 'DELETE') {
    return { success: false, message: 'Type DELETE to confirm account deletion.' };
  }

  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, role: true },
      });
      if (!currentUser) throw new Error('User not found');
      const anonymizedEmail = getDeletedUserEmail(userId);

      await clearUserWorkspaceData(tx, userId);
      await tx.userSubscription.updateMany({
        where: { userId },
        data: {
          status: 'CANCELED',
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: true,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted user',
          email: anonymizedEmail,
          password: 'deleted-account',
          status: 'DELETED',
          mustChangePassword: false,
          appPinHash: null,
          appPinSetAt: null,
          appPinResetAt: null,
          appPinReminderAt: null,
          lockedUntil: null,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.accountDeletionRecord.create({
        data: {
          deletedUserId: userId,
          originalName: currentUser.name,
          originalEmail: currentUser.email,
          originalRole: currentUser.role,
          deletionType: 'USER_SELF',
          anonymizedEmail,
          performedById: userId,
          performedByName: currentUser.name,
          performedByEmail: currentUser.email,
          note: 'User deleted their own account. Workspace data was cleared and email was released for registration.',
        },
      });
    }, { timeout: 30000 });

    revalidatePath('/');
    revalidatePath('/admin/users');
    return { success: true, message: 'Your account was deleted. You can register again with the same email.' };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return { success: false, message: 'Failed to delete account. Please try again.' };
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

  return {
    success: false,
    message: 'Manual payment confirmation is required. Submit your bKash or Nagad transaction from the subscription page.',
  };
}

export async function activateTrialPackageAction(packageId: string): Promise<ActionResponse<{
  subscriptionPlan: 'PRO';
  subscriptionInterval: SubscriptionInterval;
  subscriptionPackageId: string;
  subscriptionSource: 'SELF_SERVICE';
  subscriptionStatus: 'TRIALING';
  subscriptionCurrentPeriodEnd: string;
  subscriptionCancelAtPeriodEnd: true;
}>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      status: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!currentUser) return { success: false, message: 'Unauthorized' };
  if (currentUser.role === 'ADMIN') return { success: false, message: 'Admin users already have full access.' };

  if (hasActiveSubscriptionAccess({
    role: currentUser.role,
    status: currentUser.status,
    subscriptionPlan: currentUser.subscription?.plan || null,
    subscriptionStatus: currentUser.subscription?.status || null,
    subscriptionCurrentPeriodEnd: currentUser.subscription?.currentPeriodEnd || null,
  })) {
    return { success: false, message: 'Your access is already active.' };
  }

  if (currentUser.subscription) {
    return { success: false, message: 'Trial can be used only once. Please choose a paid package to continue.' };
  }

  const subscriptionPackage = await prisma.subscriptionPackage.findFirst({
    where: { id: packageId, isActive: true },
  });

  if (!subscriptionPackage) return { success: false, message: 'Subscription package is not available.' };
  if (!isTrialPackage(subscriptionPackage)) {
    return { success: false, message: 'This package requires payment before activation.' };
  }

  const now = new Date();
  const currentPeriodEnd = addDays(now, subscriptionPackage.trialDays);

  try {
    await prisma.userSubscription.create({
      data: {
        userId: session.user.id,
        packageId: subscriptionPackage.id,
        plan: 'PRO',
        interval: subscriptionPackage.interval,
        source: 'SELF_SERVICE',
        status: 'TRIALING',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: true,
      },
    });

    revalidatePath('/subscription');
    revalidatePath('/subscription/payment');
    revalidatePath('/settings');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Trial activated. You can use the dashboard now.',
      data: {
        subscriptionPlan: 'PRO',
        subscriptionInterval: subscriptionPackage.interval,
        subscriptionPackageId: subscriptionPackage.id,
        subscriptionSource: 'SELF_SERVICE',
        subscriptionStatus: 'TRIALING',
        subscriptionCurrentPeriodEnd: currentPeriodEnd.toISOString(),
        subscriptionCancelAtPeriodEnd: true,
      },
    };
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return { success: false, message: 'Trial can be used only once. Please choose a paid package to continue.' };
    }
    return { success: false, message: 'Failed to activate trial. Please try again.' };
  }
}

export async function createManualPaymentRequestAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      status: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!currentUser) return { success: false, message: 'Unauthorized' };

  const hasCurrentAccess = hasActiveSubscriptionAccess({
    role: currentUser.role,
    status: currentUser.status,
    subscriptionPlan: currentUser.subscription?.plan || null,
    subscriptionStatus: currentUser.subscription?.status || null,
    subscriptionCurrentPeriodEnd: currentUser.subscription?.currentPeriodEnd || null,
  });
  const isTrialAccess = currentUser.subscription?.status === 'TRIALING';

  if (hasCurrentAccess && !isTrialAccess) {
    return { success: false, message: 'Your subscription is already active. You can renew or upgrade after it expires.' };
  }

  const packageId = String(formData.get('packageId') || '').trim();
  const methodId = String(formData.get('methodId') || '').trim();
  const provider = String(formData.get('provider') || '').trim() as ManualPaymentProvider;
  const senderAccount = String(formData.get('senderAccount') || '').trim();
  const transactionId = String(formData.get('transactionId') || '').trim().toUpperCase();
  const reference = String(formData.get('reference') || '').trim();
  const paidAt = parseOptionalDate(formData.get('paidAt'));
  const screenshotUrl = String(formData.get('screenshotUrl') || '').trim() || null;
  const note = String(formData.get('note') || '').trim() || null;

  if (!packageId) return { success: false, message: 'Choose a subscription package first.' };
  if (!methodId && provider !== 'BKASH' && provider !== 'NAGAD') {
    return { success: false, message: 'Choose bKash or Nagad as the payment provider.' };
  }
  if (!senderAccount || senderAccount.length < 8 || senderAccount.length > 24) {
    return { success: false, message: 'Enter the sender wallet number used for payment.' };
  }
  if (!transactionId || transactionId.length < 6 || transactionId.length > 40) {
    return { success: false, message: 'Enter a valid transaction ID.' };
  }
  if (!reference || reference.length < 3 || reference.length > 80) {
    return { success: false, message: 'Payment reference is required.' };
  }
  if (screenshotUrl && (screenshotUrl.length > 500 || !isValidScreenshotUrl(screenshotUrl))) {
    return { success: false, message: 'Screenshot link must be a valid http or https URL.' };
  }
  if (note && note.length > 500) return { success: false, message: 'Note must be 500 characters or less.' };

  const [subscriptionPackage, method] = await Promise.all([
    prisma.subscriptionPackage.findFirst({ where: { id: packageId, isActive: true } }),
    methodId ? prisma.manualPaymentMethod.findFirst({ where: { id: methodId, isActive: true } }) : Promise.resolve(null),
  ]);

  if (!subscriptionPackage) return { success: false, message: 'Subscription package is not available.' };
  if (isTrialPackage(subscriptionPackage)) {
    return { success: false, message: 'This is a trial package. Start the trial from the package selection page without payment.' };
  }
  if (methodId && !method) return { success: false, message: 'Payment account is not available.' };

  const paymentProvider = method?.provider || provider;

  const existingPending = await prisma.manualPaymentRequest.findFirst({
    where: {
      userId: session.user.id,
      status: 'PENDING',
    },
    select: { id: true, package: { select: { name: true } } },
  });

  if (existingPending) {
    return { success: false, message: `You already have a pending payment for ${existingPending.package.name}. Please wait for admin review.` };
  }

  try {
    const now = new Date();
    const paymentRequest = await prisma.$transaction(async (tx) => {
      const createdRequest = await tx.manualPaymentRequest.create({
        data: {
          userId: session.user.id,
          packageId: subscriptionPackage.id,
          methodId: method?.id || null,
          provider: paymentProvider,
          amount: subscriptionPackage.price,
          currency: subscriptionPackage.currency,
          reference,
          senderAccount,
          transactionId,
          paidAt,
          screenshotUrl,
          note,
        },
        select: { id: true },
      });

      if (isTrialAccess) {
        await tx.userSubscription.update({
          where: { userId: session.user.id },
          data: {
            status: 'CANCELED',
            currentPeriodEnd: now,
            cancelAtPeriodEnd: true,
          },
        });
      }

      return createdRequest;
    });

    await notifyAdminsOfManualPaymentRequest({
      paymentRequestId: paymentRequest.id,
      senderId: session.user.id,
      senderName: session.user.name || session.user.email || 'A user',
      packageName: subscriptionPackage.name,
      amount: Number(subscriptionPackage.price),
      currency: subscriptionPackage.currency,
      provider: paymentProvider,
    });

    revalidatePath('/subscription');
    revalidatePath('/subscription/payment');
    revalidatePath('/dashboard');
    revalidatePath('/settings');
    revalidatePath('/admin/subscriptions');
    revalidatePath('/admin/payments');
    return {
      success: true,
      message: isTrialAccess
        ? `Payment submitted. Your trial has ended and you can use the app for ${getPendingPaymentAccessHours()} hours while admin verifies it.`
        : `Payment submitted. You can use the app for ${getPendingPaymentAccessHours()} hours while admin verifies it.`,
    };
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return { success: false, message: 'This transaction ID has already been submitted.' };
    }
    return { success: false, message: 'Failed to submit payment. Please try again.' };
  }
}
