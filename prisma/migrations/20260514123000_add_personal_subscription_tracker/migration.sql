CREATE TYPE "PersonalSubscriptionCycle" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

CREATE TYPE "PersonalSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

ALTER TYPE "Feature" ADD VALUE 'SUBSCRIPTIONS';

CREATE TABLE "PersonalSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "planName" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "billingCycle" "PersonalSubscriptionCycle" NOT NULL DEFAULT 'MONTHLY',
  "nextBillingDate" TIMESTAMP(3) NOT NULL,
  "status" "PersonalSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  "reminderDays" INTEGER NOT NULL DEFAULT 3,
  "websiteUrl" TEXT,
  "notes" TEXT,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "PersonalSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonalSubscription_userId_status_idx" ON "PersonalSubscription"("userId", "status");
CREATE INDEX "PersonalSubscription_userId_nextBillingDate_idx" ON "PersonalSubscription"("userId", "nextBillingDate");
CREATE INDEX "PersonalSubscription_accountId_idx" ON "PersonalSubscription"("accountId");

ALTER TABLE "PersonalSubscription"
ADD CONSTRAINT "PersonalSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonalSubscription"
ADD CONSTRAINT "PersonalSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
