import { createHmac, randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type {
  Prisma,
  SupportAccessAuditAction,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@prisma/client';

const SUPPORT_PIN_TTL_MINUTES = 30;
const MAX_FAILED_PIN_ATTEMPTS = 5;

export type CreateSupportTicketInput = {
  subject: string;
  description: string;
  phoneNumber?: string | null;
  priority: SupportTicketPriority;
  category: SupportTicketCategory;
};

export type SupportTicketFilters = {
  status?: SupportTicketStatus | 'all';
  priority?: SupportTicketPriority | 'all';
  category?: SupportTicketCategory | 'all';
  search?: string;
};

const ticketInclude = {
  user: { select: { id: true, name: true, email: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

const ticketDetailInclude = {
  user: { select: { id: true, name: true, email: true } },
  messages: {
    include: { sender: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  },
  accessSessions: {
    select: {
      id: true,
      adminId: true,
      pinExpiresAt: true,
      verifiedAt: true,
      revokedAt: true,
      failedAttempts: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  },
  auditLogs: {
    include: {
      admin: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
} satisfies Prisma.SupportTicketInclude;

function pinLookupHash(pin: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'takapilot-dev-support-secret';
  return createHmac('sha256', secret).update(pin).digest('hex');
}

function generatePin() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function audit(action: SupportAccessAuditAction, input: {
  userId: string;
  adminId?: string | null;
  ticketId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.supportAccessAudit.create({
    data: {
      userId: input.userId,
      adminId: input.adminId || null,
      ticketId: input.ticketId || null,
      action,
      metadata: input.metadata,
    },
  });
}

export async function createTicket(userId: string, input: CreateSupportTicketInput) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        userId,
        subject: input.subject,
        description: input.description,
        phoneNumber: input.phoneNumber || null,
        priority: input.priority,
        category: input.category,
        messages: {
          create: {
            senderId: userId,
            message: input.description,
            isFromAdmin: false,
          },
        },
      },
      include: ticketInclude,
    });

    return ticket;
  });
}

export async function getUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    include: ticketInclude,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getAllTickets(filters: SupportTicketFilters = {}) {
  const where: Prisma.SupportTicketWhereInput = {};
  const and: Prisma.SupportTicketWhereInput[] = [];

  if (filters.status && filters.status !== 'all') where.status = filters.status;
  if (filters.priority && filters.priority !== 'all') where.priority = filters.priority;
  if (filters.category && filters.category !== 'all') where.category = filters.category;
  if (filters.search) {
    const search = filters.search.trim();
    if (search) {
      and.push({
        OR: [
          { subject: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
  }

  if (and.length > 0) where.AND = and;

  return prisma.supportTicket.findMany({
    where,
    include: ticketInclude,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });
}

export async function getTicketDetails(ticketId: string, requesterId: string, isAdmin: boolean) {
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      ...(isAdmin ? {} : { userId: requesterId }),
    },
    include: ticketDetailInclude,
  });

  if (!ticket) throw new Error('Support ticket not found.');
  return ticket;
}

export async function addMessageToTicket(ticketId: string, senderId: string, message: string, isFromAdmin: boolean) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, userId: true },
  });

  if (!ticket) throw new Error('Support ticket not found.');
  if (ticket.status === 'CLOSED') throw new Error('This ticket is closed. Reopen it before replying.');

  return prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        ticketId,
        senderId,
        message,
        isFromAdmin,
      },
      include: { sender: { select: { id: true, name: true, email: true, role: true } } },
    });

    const updatedTicket = await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        status: ticket.status === 'RESOLVED' && !isFromAdmin ? 'OPEN' : ticket.status,
      },
      select: { status: true },
    });

    return { message: created, status: updatedTicket.status };
  });
}

export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
    },
    include: ticketInclude,
  });
}

export async function generateSupportPin(userId: string, ticketId?: string | null) {
  if (ticketId) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      select: { id: true },
    });
    if (!ticket) throw new Error('Support ticket not found.');
  }

  const pin = generatePin();
  const now = new Date();
  const pinExpiresAt = new Date(now.getTime() + SUPPORT_PIN_TTL_MINUTES * 60_000);
  const pinHash = await bcrypt.hash(pin, 10);
  const lookupHash = pinLookupHash(pin);

  const session = await prisma.$transaction(async (tx) => {
    await tx.supportAccessSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        pinExpiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });

    const created = await tx.supportAccessSession.create({
      data: {
        userId,
        ticketId: ticketId || null,
        pinHash,
        pinLookupHash: lookupHash,
        pinExpiresAt,
      },
      select: {
        id: true,
        userId: true,
        ticketId: true,
        pinExpiresAt: true,
      },
    });

    await tx.supportAccessAudit.create({
      data: {
        userId,
        ticketId: ticketId || null,
        action: 'PIN_GENERATED',
        metadata: { expiresAt: pinExpiresAt.toISOString() },
      },
    });

    return created;
  });

  return { session, pin };
}

export async function revokeSupportPin(userId: string, sessionId: string) {
  const now = new Date();
  const session = await prisma.supportAccessSession.findFirst({
    where: { id: sessionId, userId, revokedAt: null },
    select: { id: true, ticketId: true },
  });

  if (!session) throw new Error('Active support PIN not found.');

  await prisma.$transaction([
    prisma.supportAccessSession.update({
      where: { id: session.id },
      data: { revokedAt: now },
    }),
    prisma.supportAccessAudit.create({
      data: {
        userId,
        ticketId: session.ticketId,
        action: 'PIN_REVOKED',
      },
    }),
  ]);
}

export async function getActiveUserSupportPin(userId: string) {
  return prisma.supportAccessSession.findFirst({
    where: {
      userId,
      revokedAt: null,
      verifiedAt: null,
      pinExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      ticketId: true,
      pinExpiresAt: true,
      createdAt: true,
      failedAttempts: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function verifySupportPin(adminId: string, pin: string) {
  const now = new Date();
  const candidates = await prisma.supportAccessSession.findMany({
    where: {
      pinLookupHash: pinLookupHash(pin),
      pinExpiresAt: { gt: now },
      revokedAt: null,
      failedAttempts: { lt: MAX_FAILED_PIN_ATTEMPTS },
    },
    select: {
      id: true,
      userId: true,
      ticketId: true,
      pinHash: true,
      pinExpiresAt: true,
      failedAttempts: true,
      user: { select: { id: true, name: true, email: true } },
    },
    take: 5,
  });

  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(pin, candidate.pinHash);
    if (!isMatch) {
      await prisma.$transaction([
        prisma.supportAccessSession.update({
          where: { id: candidate.id },
          data: {
            failedAttempts: { increment: 1 },
            lastFailedAt: now,
          },
        }),
        prisma.supportAccessAudit.create({
          data: {
            userId: candidate.userId,
            adminId,
            ticketId: candidate.ticketId,
            action: 'PIN_FAILED',
            metadata: { reason: 'hash_mismatch' },
          },
        }),
      ]);
      continue;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const session = await tx.supportAccessSession.update({
        where: { id: candidate.id },
        data: {
          adminId,
          verifiedAt: now,
        },
        select: {
          id: true,
          userId: true,
          ticketId: true,
          pinExpiresAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.supportAccessAudit.create({
        data: {
          userId: candidate.userId,
          adminId,
          ticketId: candidate.ticketId,
          action: 'PIN_VERIFIED',
        },
      });

      await tx.supportAccessAudit.create({
        data: {
          userId: candidate.userId,
          adminId,
          ticketId: candidate.ticketId,
          action: 'SUPPORT_VIEW_STARTED',
        },
      });

      return session;
    });

    return updated;
  }

  throw new Error('Invalid, expired, or revoked support PIN.');
}

export async function endSupportView(sessionId: string, adminId: string) {
  const session = await prisma.supportAccessSession.findFirst({
    where: { id: sessionId, adminId },
    select: { id: true, userId: true, ticketId: true },
  });

  if (!session) return;
  await audit('SUPPORT_VIEW_ENDED', {
    userId: session.userId,
    adminId,
    ticketId: session.ticketId,
  });
}
