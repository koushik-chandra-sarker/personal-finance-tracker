'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';
import type { ManualPaymentProvider, ManualPaymentStatus, SubscriptionInterval } from '@prisma/client';

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

export async function createManualPaymentRequestAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

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
  if (methodId && !method) return { success: false, message: 'Payment account is not available.' };

  const paymentProvider = method?.provider || provider;

  const existingPending = await prisma.manualPaymentRequest.findFirst({
    where: {
      userId: session.user.id,
      packageId: subscriptionPackage.id,
      status: 'PENDING',
    },
    select: { id: true },
  });

  if (existingPending) {
    return { success: false, message: 'You already have a pending payment for this package. Please wait for admin review.' };
  }

  try {
    await prisma.manualPaymentRequest.create({
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
    });

    revalidatePath('/subscription');
    revalidatePath('/subscription/payment');
    revalidatePath('/admin/subscriptions');
    return { success: true, message: 'Payment submitted. Admin will verify it from the wallet transaction history.' };
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return { success: false, message: 'This transaction ID has already been submitted.' };
    }
    return { success: false, message: 'Failed to submit payment. Please try again.' };
  }
}
