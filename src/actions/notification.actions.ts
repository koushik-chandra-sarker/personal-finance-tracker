'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { notificationPreferenceSchema } from '@/lib/validations/notification';
import * as notificationService from '@/services/notification.service';
import type { ActionResponse } from '@/types';
import type { Notification, NotificationPreference } from '@prisma/client';

function serializeNotification(notification: Notification) {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  };
}

function serializePreferences(preferences: NotificationPreference) {
  return {
    ...preferences,
    unusualExpenseMultiplier: Number(preferences.unusualExpenseMultiplier),
    unusualExpenseMinAmount: Number(preferences.unusualExpenseMinAmount),
    lowBalanceThreshold: Number(preferences.lowBalanceThreshold),
    createdAt: preferences.createdAt.toISOString(),
    updatedAt: preferences.updatedAt.toISOString(),
  };
}

async function getSessionUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

export async function getNotificationsAction(options: { limit?: number; unreadOnly?: boolean } = {}) {
  const userId = await getSessionUserId();
  const notifications = await notificationService.getNotifications(userId, options);
  return notifications.map(serializeNotification);
}

export async function getUnreadNotificationCountAction() {
  const userId = await getSessionUserId();
  return notificationService.getUnreadCount(userId);
}

export async function getNotificationFeedAction(options: { limit?: number; unreadOnly?: boolean } = {}) {
  const userId = await getSessionUserId();
  const [notifications, unreadCount] = await Promise.all([
    notificationService.getNotifications(userId, options),
    notificationService.getUnreadCount(userId),
  ]);

  return {
    notifications: notifications.map(serializeNotification),
    unreadCount,
  };
}

export async function markNotificationReadAction(id: string): Promise<ActionResponse> {
  const userId = await getSessionUserId();
  await notificationService.markAsRead(userId, id);
  revalidatePath('/dashboard');
  return { success: true, message: 'নোটিফিকেশন পড়া হয়েছে' };
}

export async function markAllNotificationsReadAction(): Promise<ActionResponse> {
  const userId = await getSessionUserId();
  await notificationService.markAllAsRead(userId);
  revalidatePath('/dashboard');
  return { success: true, message: 'নোটিফিকেশনগুলো পড়া হয়েছে' };
}

export async function getNotificationPreferencesAction() {
  const userId = await getSessionUserId();
  const preferences = await notificationService.getOrCreateNotificationPreferences(userId);
  return serializePreferences(preferences);
}

export async function updateNotificationPreferencesAction(formData: FormData): Promise<ActionResponse> {
  const userId = await getSessionUserId();
  const raw = {
    billRemindersEnabled: formData.get('billRemindersEnabled'),
    billReminderDaysBefore: formData.get('billReminderDaysBefore'),
    budgetAlertsEnabled: formData.get('budgetAlertsEnabled'),
    budgetWarningThreshold: formData.get('budgetWarningThreshold'),
    budgetCriticalThreshold: formData.get('budgetCriticalThreshold'),
    goalDeadlineEnabled: formData.get('goalDeadlineEnabled'),
    goalReminderDaysBefore: formData.get('goalReminderDaysBefore'),
    unusualExpenseEnabled: formData.get('unusualExpenseEnabled'),
    unusualExpenseMultiplier: formData.get('unusualExpenseMultiplier'),
    unusualExpenseMinAmount: formData.get('unusualExpenseMinAmount'),
    lowBalanceEnabled: formData.get('lowBalanceEnabled'),
    lowBalanceThreshold: formData.get('lowBalanceThreshold'),
  };

  const parsed = notificationPreferenceSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'তথ্য যাচাই করা যায়নি', errors: parsed.error.flatten().fieldErrors };
  }

  await notificationService.updateNotificationPreferences(userId, parsed.data);
  revalidatePath('/settings');
  return { success: true, message: 'নোটিফিকেশন পছন্দ আপডেট হয়েছে' };
}
