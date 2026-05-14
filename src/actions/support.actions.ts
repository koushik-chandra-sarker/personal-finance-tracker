'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { getActiveSupportView, setSupportViewCookie, clearSupportViewCookie } from '@/lib/support-access';
import { publishSupportTicketEvent } from '@/lib/support-events';
import {
  supportPinSchema,
  supportReplySchema,
  supportStatusSchema,
  supportTicketCategoryValues,
  supportTicketPriorityValues,
  supportTicketSchema,
  supportTicketStatusValues,
} from '@/lib/validations/support';
import * as supportService from '@/services/support.service';
import type { ActionResponse } from '@/types';
import type { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from '@prisma/client';

export type SupportTicketRow = {
  id: string;
  userId: string;
  subject: string;
  description: string;
  phoneNumber: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string; email: string };
  messageCount: number;
};

export type SupportTicketDetail = SupportTicketRow & {
  messages: {
    id: string;
    message: string;
    isFromAdmin: boolean;
    createdAt: string;
    sender: { id: string; name: string; email: string; role: string };
  }[];
  accessSessions: {
    id: string;
    adminId: string | null;
    pinExpiresAt: string;
    verifiedAt: string | null;
    revokedAt: string | null;
    failedAttempts: number;
    createdAt: string;
  }[];
  auditLogs: {
    id: string;
    action: string;
    createdAt: string;
    admin: { id: string; name: string; email: string } | null;
  }[];
};

export type SupportTicketMessageRow = SupportTicketDetail['messages'][number];

export type ActiveSupportPin = {
  id: string;
  ticketId: string | null;
  pinExpiresAt: string;
  createdAt: string;
  failedAttempts: number;
};

export type SupportViewState = {
  sessionId: string;
  targetUserId: string;
  expiresAt: string;
  user: { id: string; name: string; email: string };
} | null;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user;
}

function firstString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseEnum<T extends string>(value: string, allowed: readonly T[], fallback: T) {
  return allowed.includes(value as T) ? value as T : fallback;
}

function serializeTicket(ticket: Awaited<ReturnType<typeof supportService.getUserTickets>>[number]): SupportTicketRow {
  return {
    id: ticket.id,
    userId: ticket.userId,
    subject: ticket.subject,
    description: ticket.description,
    phoneNumber: ticket.phoneNumber,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() || null,
    user: ticket.user,
    messageCount: ticket._count.messages,
  };
}

function serializeTicketDetail(ticket: Awaited<ReturnType<typeof supportService.getTicketDetails>>): SupportTicketDetail {
  return {
    id: ticket.id,
    userId: ticket.userId,
    subject: ticket.subject,
    description: ticket.description,
    phoneNumber: ticket.phoneNumber,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() || null,
    user: ticket.user,
    messageCount: ticket.messages.length,
    messages: ticket.messages.map((message) => ({
      id: message.id,
      message: message.message,
      isFromAdmin: message.isFromAdmin,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    })),
    accessSessions: ticket.accessSessions.map((session) => ({
      id: session.id,
      adminId: session.adminId,
      pinExpiresAt: session.pinExpiresAt.toISOString(),
      verifiedAt: session.verifiedAt?.toISOString() || null,
      revokedAt: session.revokedAt?.toISOString() || null,
      failedAttempts: session.failedAttempts,
      createdAt: session.createdAt.toISOString(),
    })),
    auditLogs: ticket.auditLogs.map((audit) => ({
      id: audit.id,
      action: audit.action,
      createdAt: audit.createdAt.toISOString(),
      admin: audit.admin,
    })),
  };
}

function supportPaths(ticketId?: string) {
  const paths = ['/support', '/admin/support'];
  if (ticketId) {
    paths.push(`/support/${ticketId}`, `/admin/support/${ticketId}`);
  }
  return paths;
}

function revalidateSupport(ticketId?: string) {
  supportPaths(ticketId).forEach((path) => revalidatePath(path));
  revalidatePath('/', 'layout');
}

export async function getUserSupportDataAction(): Promise<{ tickets: SupportTicketRow[]; activePin: ActiveSupportPin | null }> {
  const user = await getSessionUser();
  const [tickets, activePin] = await Promise.all([
    supportService.getUserTickets(user.id),
    supportService.getActiveUserSupportPin(user.id),
  ]);

  return {
    tickets: tickets.map(serializeTicket),
    activePin: activePin ? {
      id: activePin.id,
      ticketId: activePin.ticketId,
      pinExpiresAt: activePin.pinExpiresAt.toISOString(),
      createdAt: activePin.createdAt.toISOString(),
      failedAttempts: activePin.failedAttempts,
    } : null,
  };
}

export async function getUserSupportTicketAction(ticketId: string): Promise<SupportTicketDetail> {
  const user = await getSessionUser();
  const ticket = await supportService.getTicketDetails(ticketId, user.id, user.role === 'ADMIN');
  return serializeTicketDetail(ticket);
}

export async function getAdminSupportDataAction(filters: supportService.SupportTicketFilters = {}): Promise<SupportTicketRow[]> {
  await requireRole('ADMIN');
  const tickets = await supportService.getAllTickets(filters);
  return tickets.map(serializeTicket);
}

export async function getAdminSupportTicketAction(ticketId: string): Promise<SupportTicketDetail> {
  const user = await getSessionUser();
  await requireRole('ADMIN');
  const ticket = await supportService.getTicketDetails(ticketId, user.id, true);
  return serializeTicketDetail(ticket);
}

export async function getActiveSupportViewAction(): Promise<SupportViewState> {
  const supportView = await getActiveSupportView();
  if (!supportView) return null;
  return {
    sessionId: supportView.sessionId,
    targetUserId: supportView.targetUserId,
    expiresAt: supportView.expiresAt.toISOString(),
    user: supportView.user,
  };
}

export async function createSupportTicketAction(formData: FormData): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await getSessionUser();
    const parsed = supportTicketSchema.safeParse({
      subject: firstString(formData.get('subject')),
      description: firstString(formData.get('description')),
      phoneNumber: firstString(formData.get('phoneNumber')) || null,
      priority: parseEnum(firstString(formData.get('priority')), supportTicketPriorityValues, 'NORMAL'),
      category: parseEnum(firstString(formData.get('category')), supportTicketCategoryValues, 'GENERAL'),
    });

    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    const ticket = await supportService.createTicket(user.id, parsed.data);
    await supportService.notifyNewSupportTicket({
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      senderId: user.id,
    });
    revalidateSupport(ticket.id);
    return { success: true, message: 'Support ticket created.', data: { id: ticket.id } };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to create support ticket.') };
  }
}

export async function replyToSupportTicketAction(ticketId: string, formData: FormData): Promise<ActionResponse<{ message: SupportTicketMessageRow; status: SupportTicketStatus }>> {
  try {
    const user = await getSessionUser();
    const parsed = supportReplySchema.safeParse({ message: firstString(formData.get('message')) });
    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    if (user.role !== 'ADMIN') {
      await supportService.getTicketDetails(ticketId, user.id, false);
    }

    const result = await supportService.addMessageToTicket(ticketId, user.id, parsed.data.message, user.role === 'ADMIN');
    await supportService.notifySupportReply({
      ticketId,
      ticketSubject: result.ticket.subject,
      ticketOwnerId: result.ticket.userId,
      senderId: user.id,
      isFromAdmin: user.role === 'ADMIN',
    });
    revalidateSupport(ticketId);
    publishSupportTicketEvent(ticketId, 'message');
    return {
      success: true,
      message: 'Reply sent.',
      data: {
        status: result.status,
        message: {
          id: result.message.id,
          message: result.message.message,
          isFromAdmin: result.message.isFromAdmin,
          createdAt: result.message.createdAt.toISOString(),
          sender: result.message.sender,
        },
      },
    };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to send reply.') };
  }
}

export async function updateSupportTicketStatusAction(ticketId: string, formData: FormData): Promise<ActionResponse> {
  try {
    await requireRole('ADMIN');
    const parsed = supportStatusSchema.safeParse({
      status: parseEnum(firstString(formData.get('status')), supportTicketStatusValues, 'OPEN'),
    });
    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    await supportService.updateTicketStatus(ticketId, parsed.data.status);
    revalidateSupport(ticketId);
    publishSupportTicketEvent(ticketId, 'status');
    return { success: true, message: 'Ticket status updated.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to update ticket status.') };
  }
}

export async function generateSupportPinAction(ticketId?: string | null): Promise<ActionResponse<{ pin: string; expiresAt: string; sessionId: string }>> {
  try {
    const user = await getSessionUser();
    const result = await supportService.generateSupportPin(user.id, ticketId || null);
    revalidateSupport(ticketId || undefined);
    if (ticketId) publishSupportTicketEvent(ticketId, 'pin');
    return {
      success: true,
      message: 'Support PIN generated.',
      data: {
        pin: result.pin,
        expiresAt: result.session.pinExpiresAt.toISOString(),
        sessionId: result.session.id,
      },
    };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to generate support PIN.') };
  }
}

export async function revokeSupportPinAction(sessionId: string): Promise<ActionResponse> {
  try {
    const user = await getSessionUser();
    await supportService.revokeSupportPin(user.id, sessionId);
    revalidateSupport();
    return { success: true, message: 'Support PIN revoked.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to revoke support PIN.') };
  }
}

export async function verifySupportPinAction(formData: FormData): Promise<ActionResponse<SupportViewState>> {
  try {
    const user = await getSessionUser();
    await requireRole('ADMIN');
    const parsed = supportPinSchema.safeParse({ pin: firstString(formData.get('pin')) });
    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    const supportSession = await supportService.verifySupportPin(user.id, parsed.data.pin);
    await setSupportViewCookie(supportSession.id, supportSession.pinExpiresAt);
    revalidateSupport(supportSession.ticketId || undefined);

    return {
      success: true,
      message: `Support view started for ${supportSession.user.name}.`,
      data: {
        sessionId: supportSession.id,
        targetUserId: supportSession.userId,
        expiresAt: supportSession.pinExpiresAt.toISOString(),
        user: supportSession.user,
      },
    };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to verify support PIN.') };
  }
}

export async function exitSupportViewAction(): Promise<ActionResponse> {
  try {
    const user = await getSessionUser();
    const activeView = await getActiveSupportView();
    if (activeView) {
      await supportService.endSupportView(activeView.sessionId, user.id);
    }
    await clearSupportViewCookie();
    revalidatePath('/', 'layout');
    return { success: true, message: 'Support view exited.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to exit support view.') };
  }
}

export async function resetUserAppPinFromSupportAction(ticketId: string): Promise<ActionResponse> {
  try {
    const user = await getSessionUser();
    await requireRole('ADMIN');
    const ticket = await supportService.getTicketDetails(ticketId, user.id, true);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: ticket.userId },
        data: {
          appPinHash: null,
          appPinSetAt: null,
          appPinResetAt: new Date(),
        },
      }),
      prisma.supportMessage.create({
        data: {
          ticketId,
          senderId: user.id,
          isFromAdmin: true,
          message: 'Your app PIN has been reset by support. You can create a new PIN from the in-app suggestion after you continue.',
        },
      }),
    ]);

    revalidateSupport(ticketId);
    publishSupportTicketEvent(ticketId, 'message');
    return { success: true, message: 'User app PIN reset.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to reset user app PIN.') };
  }
}
