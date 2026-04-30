import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type NotificationType =
  | 'BILL_REMINDER'
  | 'BUDGET_ALERT'
  | 'GOAL_DEADLINE'
  | 'GOAL_REACHED'
  | 'UNUSUAL_EXPENSE'
  | 'LOW_BALANCE'
  | 'RECURRING_CREATED'
  | 'INSIGHT'
  | 'SYSTEM';

type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
type NotificationSource =
  | 'RECURRING_TRANSACTION'
  | 'BUDGET'
  | 'GOAL'
  | 'TRANSACTION'
  | 'ACCOUNT'
  | 'SYSTEM';

type CreateNotificationData = {
  title: string;
  message: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  sourceType?: NotificationSource;
  sourceId?: string;
  dedupeKey?: string;
  actionUrl?: string;
};

export async function getNotifications(userId: string, options: { limit?: number; unreadOnly?: boolean } = {}) {
  const { limit = 20, unreadOnly = false } = options;
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });

  if (result.count === 0) throw new Error('Notification not found');
  return true;
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function createNotification(userId: string, data: CreateNotificationData) {
  return prisma.notification.create({
    data: { userId, ...data },
  });
}

export async function createNotificationOnce(userId: string, data: CreateNotificationData) {
  if (!data.dedupeKey) {
    const notification = await createNotification(userId, data);
    return { notification, created: true };
  }

  try {
    const notification = await prisma.notification.create({
      data: { userId, ...data },
    });
    return { notification, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { notification: null, created: false };
    }
    throw error;
  }
}

export async function getOrCreateNotificationPreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function updateNotificationPreferences(userId: string, data: {
  billRemindersEnabled: boolean;
  billReminderDaysBefore: number;
  budgetAlertsEnabled: boolean;
  budgetWarningThreshold: number;
  budgetCriticalThreshold: number;
  goalDeadlineEnabled: boolean;
  goalReminderDaysBefore: number;
  unusualExpenseEnabled: boolean;
  unusualExpenseMultiplier: number;
  unusualExpenseMinAmount: number;
  lowBalanceEnabled: boolean;
  lowBalanceThreshold: number;
}) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
