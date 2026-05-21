import { prisma } from '@/lib/prisma';
import type { AdminMessageAudience, AdminMessageDisplayMode, AdminMessageFrequency, NotificationSeverity, Prisma } from '@prisma/client';
import { hasActiveSubscriptionAccess } from '@/lib/subscription-access';
import { publishNotificationEvent } from '@/lib/notification-events';
import { sendWebPushToUsers } from '@/lib/web-push';

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
  browserPushEnabled: boolean;
  browserPushDaily: boolean;
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
      browserPushEnabled: input.browserPushEnabled,
      browserPushDaily: input.browserPushDaily,
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
        browserPushEnabled: input.browserPushEnabled,
        browserPushDaily: input.browserPushDaily,
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

function isSameUtcDay(left: Date, right: Date) {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

export async function getBrowserPushAdminMessagesForUser(userId: string, now = new Date()) {
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
      browserPushEnabled: true,
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
        select: {
          seenCount: true,
          lastSeenAt: true,
          dismissedAt: true,
          browserPushSentCount: true,
          browserPushLastSentAt: true,
        },
      },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 10,
  });

  return messages
    .filter((message) => {
      const state = message.states[0];
      if (!state?.browserPushLastSentAt) return true;
      if (!message.browserPushDaily) return false;
      return !isSameUtcDay(state.browserPushLastSentAt, now);
    })
    .slice(0, 5);
}

export async function markAdminMessageBrowserPushed(userId: string, messageId: string) {
  const message = await prisma.adminMessage.findFirst({
    where: {
      id: messageId,
      browserPushEnabled: true,
      OR: [
        { audience: 'ALL' },
        { recipients: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  if (!message) throw new Error('Message not found');

  return prisma.adminMessageState.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: {
      messageId,
      userId,
      seenCount: 0,
      browserPushSentCount: 1,
      browserPushLastSentAt: new Date(),
    },
    update: {
      browserPushSentCount: { increment: 1 },
      browserPushLastSentAt: new Date(),
    },
  });
}

async function markAdminMessageBrowserPushedForUsers(messageId: string, userIds: string[], now = new Date()) {
  if (userIds.length === 0) return;

  await Promise.all(userIds.map((userId) => prisma.adminMessageState.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: {
      messageId,
      userId,
      seenCount: 0,
      browserPushSentCount: 1,
      browserPushLastSentAt: now,
    },
    update: {
      browserPushSentCount: { increment: 1 },
      browserPushLastSentAt: now,
    },
  })));
}

async function getBrowserPushTargetUserIds(messageId: string, options: { onlyDue?: boolean; now?: Date } = {}) {
  const now = options.now || new Date();
  const message = await prisma.adminMessage.findUnique({
    where: { id: messageId },
    select: {
      audience: true,
      showToUnsubscribed: true,
      browserPushDaily: true,
      recipients: { select: { userId: true } },
    },
  });

  if (!message) return [];

  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: 'USER',
      ...(message.audience === 'SELECTED'
        ? { id: { in: message.recipients.map((recipient) => recipient.userId) } }
        : {}),
    },
    select: {
      id: true,
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

  const targetUserIds = users
    .filter((user) => (
      message.showToUnsubscribed
      || hasActiveSubscriptionAccess({
        role: user.role,
        status: user.status,
        subscriptionPlan: user.subscription?.plan || null,
        subscriptionStatus: user.subscription?.status || null,
        subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd || null,
      })
    ))
    .map((user) => user.id);

  if (!options.onlyDue || targetUserIds.length === 0) return targetUserIds;

  const states = await prisma.adminMessageState.findMany({
    where: {
      messageId,
      userId: { in: targetUserIds },
    },
    select: {
      userId: true,
      browserPushLastSentAt: true,
    },
  });
  const sentByUserId = new Map(states.map((state) => [state.userId, state.browserPushLastSentAt]));

  return targetUserIds.filter((userId) => {
    const lastSentAt = sentByUserId.get(userId);
    if (!lastSentAt) return true;
    return message.browserPushDaily && !isSameUtcDay(lastSentAt, now);
  });
}

export async function publishAdminMessageBrowserPush(messageId: string, options: { onlyDue?: boolean; now?: Date } = {}) {
  const userIds = await getBrowserPushTargetUserIds(messageId, options);
  const message = await prisma.adminMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      title: true,
      message: true,
      actionUrl: true,
    },
  });

  if (!message || userIds.length === 0) return { targetCount: 0, webPushCount: 0, liveTabCount: 0 };

  const webPushResult = await sendWebPushToUsers(userIds, {
    title: message.title,
    body: message.message,
    url: message.actionUrl || '/dashboard',
    tag: `admin-message-${message.id}`,
  });

  await markAdminMessageBrowserPushedForUsers(messageId, webPushResult.deliveredUserIds, options.now);
  userIds.forEach((userId) => publishNotificationEvent(userId));

  return {
    targetCount: userIds.length,
    webPushCount: webPushResult.deliveredUserIds.length,
    liveTabCount: userIds.length,
  };
}

export async function pushAdminMessageNow(id: string) {
  const now = new Date();
  const message = await prisma.adminMessage.update({
    where: { id },
    data: {
      isActive: true,
      browserPushEnabled: true,
      startsAt: now,
      states: {
        updateMany: {
          where: {},
          data: { browserPushLastSentAt: null },
        },
      },
    },
    select: { id: true },
  });

  return publishAdminMessageBrowserPush(message.id);
}

export async function publishDueAdminMessageBrowserPushes(now = new Date()) {
  const messages = await prisma.adminMessage.findMany({
    where: {
      isActive: true,
      browserPushEnabled: true,
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
      ],
    },
    select: { id: true },
    take: 100,
  });

  const results = await Promise.all(messages.map((message) => (
    publishAdminMessageBrowserPush(message.id, { onlyDue: true, now })
  )));

  return results.reduce<{ messageCount: number; targetCount: number; webPushCount: number; liveTabCount: number }>((summary, result) => ({
    messageCount: summary.messageCount + (result.targetCount > 0 ? 1 : 0),
    targetCount: summary.targetCount + result.targetCount,
    webPushCount: summary.webPushCount + result.webPushCount,
    liveTabCount: summary.liveTabCount + result.liveTabCount,
  }), { messageCount: 0, targetCount: 0, webPushCount: 0, liveTabCount: 0 });
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
      displayMode: { not: 'PUSH_ONLY' },
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
        select: {
          seenCount: true,
          lastSeenAt: true,
          dismissedAt: true,
          browserPushSentCount: true,
          browserPushLastSentAt: true,
        },
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
