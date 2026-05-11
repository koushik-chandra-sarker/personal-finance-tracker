CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SupportTicketCategory" AS ENUM ('GENERAL', 'BILLING', 'BUG_REPORT', 'FEATURE_REQUEST', 'ACCOUNT_ISSUE');
CREATE TYPE "SupportAccessAuditAction" AS ENUM ('PIN_GENERATED', 'PIN_REVOKED', 'PIN_VERIFIED', 'PIN_FAILED', 'SUPPORT_VIEW_STARTED', 'SUPPORT_VIEW_ENDED', 'SUPPORT_VIEW_EXPIRED');

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportAccessSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "ticketId" TEXT,
    "pinHash" TEXT NOT NULL,
    "pinLookupHash" TEXT NOT NULL,
    "pinExpiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportAccessSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportAccessAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "ticketId" TEXT,
    "action" "SupportAccessAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAccessAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX "SupportTicket_category_idx" ON "SupportTicket"("category");
CREATE INDEX "SupportTicket_updatedAt_idx" ON "SupportTicket"("updatedAt");
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
CREATE INDEX "SupportMessage_senderId_idx" ON "SupportMessage"("senderId");
CREATE INDEX "SupportAccessSession_userId_idx" ON "SupportAccessSession"("userId");
CREATE INDEX "SupportAccessSession_adminId_idx" ON "SupportAccessSession"("adminId");
CREATE INDEX "SupportAccessSession_ticketId_idx" ON "SupportAccessSession"("ticketId");
CREATE INDEX "SupportAccessSession_pinLookupHash_idx" ON "SupportAccessSession"("pinLookupHash");
CREATE INDEX "SupportAccessSession_pinExpiresAt_idx" ON "SupportAccessSession"("pinExpiresAt");
CREATE INDEX "SupportAccessAudit_userId_createdAt_idx" ON "SupportAccessAudit"("userId", "createdAt");
CREATE INDEX "SupportAccessAudit_adminId_createdAt_idx" ON "SupportAccessAudit"("adminId", "createdAt");
CREATE INDEX "SupportAccessAudit_ticketId_idx" ON "SupportAccessAudit"("ticketId");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportAccessSession" ADD CONSTRAINT "SupportAccessSession_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportAccessAudit" ADD CONSTRAINT "SupportAccessAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportAccessAudit" ADD CONSTRAINT "SupportAccessAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportAccessAudit" ADD CONSTRAINT "SupportAccessAudit_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
