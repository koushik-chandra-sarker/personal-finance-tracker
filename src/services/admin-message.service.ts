import { prisma } from '@/lib/prisma';
import type { AdminMessageAudience, AdminMessageDisplayMode, AdminMessageFrequency, NotificationSeverity, Prisma } from '@prisma/client';
import { hasActiveSubscriptionAccess } from '@/lib/subscription-access';

export type AdminMessageInput = {
  title: string;
  message: string;
  severity: NotificationSeverity;
  displayMode: AdminMessageDisplayMode;
  frequency: AdminMessageFrequency;
  audience: AdminMessageAudience;
  showToUnsubscribed: boolean;
  actionLabel?: string | null;
  actionUrl?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  recipientIds: string[];
  createdById?: string | null;
};

export type UpdateAdminMessageInput = Omit<AdminMessageInput, 'createdById'>;

const adminMessageInclude = {
  recipients: {
    select: {
      userId: true,
      user: { select: { name: true, email: true } },
    },
  },
  createdBy: { select: { name: true, email: true } },
  _count: { select: { states: true } },
} satisfies Prisma.AdminMessageInclude;

export async function getAdminMessages() {
  return prisma.adminMessage.findMany({
    include: adminMessageInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function createAdminMessage(input: AdminMessageInput) {
  return prisma.adminMessage.create({
    data: {
      title: input.title,
      message: input.message,
      severity: input.severity,
      displayMode: input.displayMode,
      frequency: input.frequency,
      audience: input.audience,
      showToUnsubscribed: input.showToUnsubscribed,
      actionLabel: input.actionLabel || null,
      actionUrl: input.actionUrl || null,
      startsAt: input.startsAt || null,
      endsAt: input.endsAt || null,
      isActive: input.isActive,
      createdById: input.createdById || null,
      recipients: input.audience === 'SELECTED'
        ? { create: input.recipientIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: adminMessageInclude,
  });
}

export async function updateAdminMessage(id: string, input: UpdateAdminMessageInput) {
  const recipientIds = Array.from(new Set(input.recipientIds));

  return prisma.$transaction(async (tx) => {
    await tx.adminMessageState.deleteMany({ where: { messageId: id } });

    return tx.adminMessage.update({
      where: { id },
      data: {
        title: input.title,
        message: input.message,
        severity: input.severity,
        displayMode: input.displayMode,
        frequency: input.frequency,
        audience: input.audience,
        showToUnsubscribed: input.showToUnsubscribed,
        actionLabel: input.actionLabel || null,
        actionUrl: input.actionUrl || null,
        startsAt: input.startsAt || null,
        endsAt: input.endsAt || null,
        isActive: input.isActive,
        recipients: {
          deleteMany: {},
          ...(input.audience === 'SELECTED'
            ? { create: recipientIds.map((userId) => ({ userId })) }
            : {}),
        },
      },
      include: adminMessageInclude,
    });
  });
}

export async function updateAdminMessageStatus(id: string, isActive: boolean) {
  return prisma.adminMessage.update({
    where: { id },
    data: { isActive },
    include: adminMessageInclude,
  });
}

export async function deleteAdminMessage(id: string) {
  return prisma.adminMessage.delete({ where: { id } });
}

export async function getVisibleAdminMessagesForUser(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user || user.role === 'ADMIN') return [];

  const canSeeSubscribedOnlyMessages = hasActiveSubscriptionAccess({
    role: user.role,
    status: user.status,
    subscriptionPlan: user.subscription?.plan || null,
    subscriptionStatus: user.subscription?.status || null,
    subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd || null,
  });

  const messages = await prisma.adminMessage.findMany({
    where: {
      isActive: true,
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
        {
          OR: [
            { audience: 'ALL' },
            { recipients: { some: { userId } } },
          ],
        },
        canSeeSubscribedOnlyMessages
          ? {}
          : { showToUnsubscribed: true },
      ],
    },
    include: {
      states: {
        where: { userId },
        select: { seenCount: true, lastSeenAt: true, dismissedAt: true },
      },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 10,
  });

  return messages.filter((message) => {
    const state = message.states[0];
    if (message.frequency === 'EVERY_REFRESH') return true;
    if (message.frequency === 'ONCE') return !state?.lastSeenAt;
    return !state?.dismissedAt;
  });
}

export async function markAdminMessageSeen(userId: string, messageId: string, dismissed: boolean) {
  const message = await prisma.adminMessage.findFirst({
    where: {
      id: messageId,
      OR: [
        { audience: 'ALL' },
        { recipients: { some: { userId } } },
      ],
    },
    select: { id: true, frequency: true },
  });

  if (!message) throw new Error('Message not found');

  return prisma.adminMessageState.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: {
      messageId,
      userId,
      seenCount: 1,
      lastSeenAt: new Date(),
      dismissedAt: dismissed || message.frequency === 'ONCE' ? new Date() : null,
    },
    update: {
      seenCount: { increment: 1 },
      lastSeenAt: new Date(),
      ...(dismissed || message.frequency === 'ONCE' ? { dismissedAt: new Date() } : {}),
    },
  });
}
