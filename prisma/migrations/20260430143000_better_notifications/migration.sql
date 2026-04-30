-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS');

-- CreateEnum
CREATE TYPE "NotificationSource" AS ENUM ('RECURRING_TRANSACTION', 'BUDGET', 'GOAL', 'TRANSACTION', 'ACCOUNT', 'SYSTEM');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BILL_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'GOAL_DEADLINE';
ALTER TYPE "NotificationType" ADD VALUE 'UNUSUAL_EXPENSE';
ALTER TYPE "NotificationType" ADD VALUE 'LOW_BALANCE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
ADD COLUMN "sourceType" "NotificationSource",
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "dedupeKey" TEXT,
ADD COLUMN "actionUrl" TEXT;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "billReminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "budgetAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "budgetWarningThreshold" INTEGER NOT NULL DEFAULT 80,
    "budgetCriticalThreshold" INTEGER NOT NULL DEFAULT 100,
    "goalDeadlineEnabled" BOOLEAN NOT NULL DEFAULT true,
    "goalReminderDaysBefore" INTEGER NOT NULL DEFAULT 14,
    "unusualExpenseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "unusualExpenseMultiplier" DECIMAL(6,2) NOT NULL DEFAULT 2.00,
    "unusualExpenseMinAmount" DECIMAL(12,2) NOT NULL DEFAULT 50.00,
    "lowBalanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowBalanceThreshold" DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
