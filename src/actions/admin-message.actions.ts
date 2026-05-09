'use server';

import { revalidatePath } from 'next/cache';
import type { AdminMessageAudience, AdminMessageDisplayMode, AdminMessageFrequency, NotificationSeverity } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import * as adminMessageService from '@/services/admin-message.service';
import type { UpdateAdminMessageInput } from '@/services/admin-message.service';
import type { ActionResponse } from '@/types';

const severityValues: NotificationSeverity[] = ['INFO', 'WARNING', 'CRITICAL', 'SUCCESS'];
const displayModeValues: AdminMessageDisplayMode[] = ['MODAL', 'BANNER'];
const frequencyValues: AdminMessageFrequency[] = ['EVERY_REFRESH', 'ONCE', 'UNTIL_DISMISSED'];
const audienceValues: AdminMessageAudience[] = ['ALL', 'SELECTED'];

export type AdminMessageUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AdminMessageRow = {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  displayMode: AdminMessageDisplayMode;
  frequency: AdminMessageFrequency;
  audience: AdminMessageAudience;
  actionLabel: string | null;
  actionUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  recipients: { userId: string; name: string; email: string }[];
  seenCount: number;
};

export type UserAdminMessage = {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  displayMode: AdminMessageDisplayMode;
  frequency: AdminMessageFrequency;
  actionLabel: string | null;
  actionUrl: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function firstString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseEnum<T extends string>(value: string, allowed: T[], fallback: T) {
  return allowed.includes(value as T) ? value as T : fallback;
}

function parseOptionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeAdminMessage(message: Awaited<ReturnType<typeof adminMessageService.getAdminMessages>>[number]): AdminMessageRow {
  return {
    id: message.id,
    title: message.title,
    message: message.message,
    severity: message.severity,
    displayMode: message.displayMode,
    frequency: message.frequency,
    audience: message.audience,
    actionLabel: message.actionLabel,
    actionUrl: message.actionUrl,
    startsAt: message.startsAt?.toISOString() || null,
    endsAt: message.endsAt?.toISOString() || null,
    isActive: message.isActive,
    createdAt: message.createdAt.toISOString(),
    createdBy: message.createdBy?.name || message.createdBy?.email || 'System',
    recipients: message.recipients.map((recipient) => ({
      userId: recipient.userId,
      name: recipient.user.name,
      email: recipient.user.email,
    })),
    seenCount: message._count.states,
  };
}

function serializeUserMessage(message: Awaited<ReturnType<typeof adminMessageService.getVisibleAdminMessagesForUser>>[number]): UserAdminMessage {
  return {
    id: message.id,
    title: message.title,
    message: message.message,
    severity: message.severity,
    displayMode: message.displayMode,
    frequency: message.frequency,
    actionLabel: message.actionLabel,
    actionUrl: message.actionUrl,
  };
}

function parseAdminMessageForm(formData: FormData): { success: true; input: UpdateAdminMessageInput } | { success: false; response: ActionResponse } {
  const title = firstString(formData.get('title'));
  const message = firstString(formData.get('message'));
  const severity = parseEnum(firstString(formData.get('severity')), severityValues, 'INFO');
  const displayMode = parseEnum(firstString(formData.get('displayMode')), displayModeValues, 'MODAL');
  const frequency = parseEnum(firstString(formData.get('frequency')), frequencyValues, 'ONCE');
  const audience = parseEnum(firstString(formData.get('audience')), audienceValues, 'ALL');
  const recipientIds = formData.getAll('recipientIds').filter((value): value is string => typeof value === 'string' && value.length > 0);
  const actionLabel = firstString(formData.get('actionLabel')) || null;
  const actionUrl = firstString(formData.get('actionUrl')) || null;
  const startsAt = parseOptionalDate(firstString(formData.get('startsAt')));
  const endsAt = parseOptionalDate(firstString(formData.get('endsAt')));

  if (!title || !message) return { success: false, response: { success: false, message: 'Title and message are required.' } };
  if (audience === 'SELECTED' && recipientIds.length === 0) {
    return { success: false, response: { success: false, message: 'Select at least one user or choose all users.' } };
  }
  if (endsAt && startsAt && endsAt <= startsAt) {
    return { success: false, response: { success: false, message: 'End date must be after start date.' } };
  }

  return {
    success: true,
    input: {
      title,
      message,
      severity,
      displayMode,
      frequency,
      audience,
      actionLabel,
      actionUrl,
      startsAt,
      endsAt,
      isActive: formData.get('isActive') === 'on',
      recipientIds: Array.from(new Set(recipientIds)),
    },
  };
}

export async function getAdminMessageUsersAction(): Promise<AdminMessageUserOption[]> {
  await requireRole('ADMIN');
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 200,
  });

  return users;
}

export async function getAdminMessagesAction(): Promise<AdminMessageRow[]> {
  await requireRole('ADMIN');
  const messages = await adminMessageService.getAdminMessages();
  return messages.map(serializeAdminMessage);
}

export async function createAdminMessageAction(formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');
  const session = await auth();

  try {
    const parsed = parseAdminMessageForm(formData);
    if (!parsed.success) return parsed.response;

    await adminMessageService.createAdminMessage({
      ...parsed.input,
      createdById: session?.user?.id || null,
    });

    revalidatePath('/admin/messages');
    return { success: true, message: 'Message created successfully.' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'Failed to create message.') };
  }
}

export async function updateAdminMessageAction(id: string, formData: FormData): Promise<ActionResponse> {
  await requireRole('ADMIN');

  try {
    const parsed = parseAdminMessageForm(formData);
    if (!parsed.success) return parsed.response;

    await adminMessageService.updateAdminMessage(id, parsed.input);

    revalidatePath('/admin/messages');
    return { success: true, message: 'Message updated successfully.' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'Failed to update message.') };
  }
}

export async function updateAdminMessageStatusAction(id: string, isActive: boolean): Promise<ActionResponse> {
  await requireRole('ADMIN');

  try {
    await adminMessageService.updateAdminMessageStatus(id, isActive);
    revalidatePath('/admin/messages');
    return { success: true, message: isActive ? 'Message activated.' : 'Message paused.' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'Failed to update message.') };
  }
}

export async function deleteAdminMessageAction(id: string): Promise<ActionResponse> {
  await requireRole('ADMIN');

  try {
    await adminMessageService.deleteAdminMessage(id);
    revalidatePath('/admin/messages');
    return { success: true, message: 'Message deleted.' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'Failed to delete message.') };
  }
}

export async function getUserAdminMessagesAction(): Promise<UserAdminMessage[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const messages = await adminMessageService.getVisibleAdminMessagesForUser(session.user.id);
  return messages.map(serializeUserMessage);
}

export async function markAdminMessageSeenAction(id: string, dismissed = false): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    await adminMessageService.markAdminMessageSeen(session.user.id, id, dismissed);
    return { success: true, message: 'Message updated.' };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, 'Failed to update message.') };
  }
}
