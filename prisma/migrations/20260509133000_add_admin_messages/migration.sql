CREATE TYPE "AdminMessageAudience" AS ENUM ('ALL', 'SELECTED');
CREATE TYPE "AdminMessageDisplayMode" AS ENUM ('MODAL', 'BANNER');
CREATE TYPE "AdminMessageFrequency" AS ENUM ('EVERY_REFRESH', 'ONCE', 'UNTIL_DISMISSED');

CREATE TABLE "AdminMessage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "displayMode" "AdminMessageDisplayMode" NOT NULL DEFAULT 'MODAL',
    "frequency" "AdminMessageFrequency" NOT NULL DEFAULT 'ONCE',
    "audience" "AdminMessageAudience" NOT NULL DEFAULT 'ALL',
    "actionLabel" TEXT,
    "actionUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminMessageRecipient" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AdminMessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminMessageState" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "AdminMessageState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminMessage_isActive_startsAt_endsAt_idx" ON "AdminMessage"("isActive", "startsAt", "endsAt");
CREATE INDEX "AdminMessage_audience_idx" ON "AdminMessage"("audience");
CREATE INDEX "AdminMessage_createdAt_idx" ON "AdminMessage"("createdAt");
CREATE UNIQUE INDEX "AdminMessageRecipient_messageId_userId_key" ON "AdminMessageRecipient"("messageId", "userId");
CREATE INDEX "AdminMessageRecipient_userId_idx" ON "AdminMessageRecipient"("userId");
CREATE UNIQUE INDEX "AdminMessageState_messageId_userId_key" ON "AdminMessageState"("messageId", "userId");
CREATE INDEX "AdminMessageState_userId_dismissedAt_idx" ON "AdminMessageState"("userId", "dismissedAt");

ALTER TABLE "AdminMessage" ADD CONSTRAINT "AdminMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminMessageRecipient" ADD CONSTRAINT "AdminMessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AdminMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminMessageRecipient" ADD CONSTRAINT "AdminMessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminMessageState" ADD CONSTRAINT "AdminMessageState_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AdminMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminMessageState" ADD CONSTRAINT "AdminMessageState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
