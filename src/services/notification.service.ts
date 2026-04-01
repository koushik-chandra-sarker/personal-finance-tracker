import { prisma } from '@/lib/prisma';

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(userId: string, id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function createNotification(userId: string, data: {
  title: string; message: string; type: 'BUDGET_ALERT' | 'GOAL_REACHED' | 'RECURRING_CREATED' | 'INSIGHT' | 'SYSTEM';
}) {
  return prisma.notification.create({
    data: { userId, ...data },
  });
}
