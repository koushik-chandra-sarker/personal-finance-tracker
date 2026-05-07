-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Feature" AS ENUM ('TRANSACTIONS', 'ACCOUNTS', 'BUDGETS', 'GOALS', 'INVESTMENTS', 'REPORTS', 'SETTINGS', 'NOTES');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('NONE', 'VIEW', 'EDIT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITED', 'DELETED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('PRO');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('SELF_SERVICE', 'ADMIN_GRANT');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'MOBILE_WALLET', 'CREDIT_CARD', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialNoteMode" AS ENUM ('SIMPLE', 'EXTENDED');

-- CreateEnum
CREATE TYPE "FinancialNoteValueType" AS ENUM ('MONEY', 'ASSET', 'MONEY_AND_ASSET', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialNoteStatus" AS ENUM ('OPEN', 'PARTIAL', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "GoalTransactionType" AS ENUM ('CONTRIBUTION', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BILL_REMINDER', 'BUDGET_ALERT', 'GOAL_DEADLINE', 'GOAL_REACHED', 'INVESTMENT_MATURITY', 'INVESTMENT_RETURN_DUE', 'UNUSUAL_EXPENSE', 'LOW_BALANCE', 'RECURRING_CREATED', 'INSIGHT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS');

-- CreateEnum
CREATE TYPE "NotificationSource" AS ENUM ('RECURRING_TRANSACTION', 'BUDGET', 'GOAL', 'INVESTMENT', 'TRANSACTION', 'ACCOUNT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'MATURED', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'AT_MATURITY', 'ON_SALE');

-- CreateEnum
CREATE TYPE "InvestmentCashflowType" AS ENUM ('BUY', 'ADD_FUNDS', 'INSTALLMENT', 'RETURN', 'TAX', 'FEE', 'SALE', 'MATURITY_PAYOUT', 'REVERSAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "packageId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'PRO',
    "interval" "SubscriptionInterval",
    "source" "SubscriptionSource" NOT NULL DEFAULT 'SELF_SERVICE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "grantedById" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "price" DECIMAL(12,2) NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "discountLabel" TEXT,
    "featureBullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedAccess" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureAccess" (
    "id" TEXT NOT NULL,
    "sharedAccessId" TEXT NOT NULL,
    "feature" "Feature" NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "FeatureAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "rolloverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "currentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "icon" TEXT NOT NULL DEFAULT 'target',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalProgress" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "GoalTransactionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "sourceType" "NotificationSource",
    "sourceId" TEXT,
    "dedupeKey" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

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
    "investmentMaturityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "investmentReminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "dpsReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "FinancialNoteMode" NOT NULL DEFAULT 'SIMPLE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "counterpartyName" TEXT,
    "valueType" "FinancialNoteValueType",
    "amount" DECIMAL(12,2),
    "assetName" TEXT,
    "assetDetails" TEXT,
    "providedDate" TIMESTAMP(3),
    "expectedReturnDate" TIMESTAMP(3),
    "returnedDate" TIMESTAMP(3),
    "status" "FinancialNoteStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "FinancialNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentTypeConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'trending-up',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hasInterestRate" BOOLEAN NOT NULL DEFAULT false,
    "hasReturnFrequency" BOOLEAN NOT NULL DEFAULT false,
    "hasMaturityDate" BOOLEAN NOT NULL DEFAULT true,
    "hasMonthlyInstallment" BOOLEAN NOT NULL DEFAULT false,
    "hasQuantity" BOOLEAN NOT NULL DEFAULT false,
    "hasInstitution" BOOLEAN NOT NULL DEFAULT true,
    "hasAccountNumber" BOOLEAN NOT NULL DEFAULT true,
    "returnTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "typeConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "institutionName" TEXT,
    "accountNumber" TEXT,
    "investedAmount" DECIMAL(14,2) NOT NULL,
    "currentValue" DECIMAL(14,2) NOT NULL,
    "interestRate" DECIMAL(6,3),
    "returnFrequency" "ReturnFrequency",
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "soldDate" TIMESTAMP(3),
    "linkedAccountId" TEXT,
    "monthlyInstallment" DECIMAL(14,2),
    "installmentDueDay" INTEGER,
    "missedInstallmentCount" INTEGER NOT NULL DEFAULT 0,
    "lastMissedInstallmentOn" TIMESTAMP(3),
    "lastInstallmentPaidOn" TIMESTAMP(3),
    "quantity" DECIMAL(14,4),
    "avgBuyPrice" DECIMAL(14,4),
    "notes" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'trending-up',
    "sanchayapatraConfigId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentReturn" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentValuation" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentCashflow" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "transactionId" TEXT,
    "accountId" TEXT,
    "type" "InvestmentCashflowType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "principalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "returnAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "installmentDueDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "InvestmentCashflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanchayapatraConfig" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rate" DECIMAL(5,2) NOT NULL,
    "taxThreshold" DECIMAL(12,2) NOT NULL DEFAULT 500000,
    "taxRateBelow" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "taxRateAbove" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "payoutFrequency" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SanchayapatraConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");

-- CreateIndex
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "UserInvite_acceptedAt_idx" ON "UserInvite"("acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_userId_key" ON "UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "UserSubscription_userId_status_idx" ON "UserSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "UserSubscription_packageId_idx" ON "UserSubscription"("packageId");

-- CreateIndex
CREATE INDEX "UserSubscription_plan_status_idx" ON "UserSubscription"("plan", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPackage_slug_key" ON "SubscriptionPackage"("slug");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_isActive_sortOrder_idx" ON "SubscriptionPackage"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_interval_idx" ON "SubscriptionPackage"("interval");

-- CreateIndex
CREATE INDEX "SharedAccess_ownerId_idx" ON "SharedAccess"("ownerId");

-- CreateIndex
CREATE INDEX "SharedAccess_collaboratorId_idx" ON "SharedAccess"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedAccess_ownerId_collaboratorId_key" ON "SharedAccess"("ownerId", "collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureAccess_sharedAccessId_feature_key" ON "FeatureAccess"("sharedAccessId", "feature");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_idx" ON "Transaction"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "Transaction_userId_accountId_idx" ON "Transaction"("userId", "accountId");

-- CreateIndex
CREATE INDEX "Budget_userId_month_year_idx" ON "Budget"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year");

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");

-- CreateIndex
CREATE INDEX "RecurringTransaction_nextRunDate_idx" ON "RecurringTransaction"("nextRunDate");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "GoalProgress_goalId_idx" ON "GoalProgress"("goalId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "FinancialNote_userId_createdAt_idx" ON "FinancialNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialNote_userId_expectedReturnDate_idx" ON "FinancialNote"("userId", "expectedReturnDate");

-- CreateIndex
CREATE INDEX "FinancialNote_userId_status_idx" ON "FinancialNote"("userId", "status");

-- CreateIndex
CREATE INDEX "InvestmentTypeConfig_userId_isActive_idx" ON "InvestmentTypeConfig"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentTypeConfig_userId_slug_key" ON "InvestmentTypeConfig"("userId", "slug");

-- CreateIndex
CREATE INDEX "Investment_userId_typeConfigId_idx" ON "Investment"("userId", "typeConfigId");

-- CreateIndex
CREATE INDEX "Investment_userId_status_idx" ON "Investment"("userId", "status");

-- CreateIndex
CREATE INDEX "Investment_userId_maturityDate_idx" ON "Investment"("userId", "maturityDate");

-- CreateIndex
CREATE INDEX "Investment_sanchayapatraConfigId_idx" ON "Investment"("sanchayapatraConfigId");

-- CreateIndex
CREATE INDEX "InvestmentReturn_investmentId_date_idx" ON "InvestmentReturn"("investmentId", "date");

-- CreateIndex
CREATE INDEX "InvestmentValuation_investmentId_date_idx" ON "InvestmentValuation"("investmentId", "date");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_investmentId_date_idx" ON "InvestmentCashflow"("investmentId", "date");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_transactionId_idx" ON "InvestmentCashflow"("transactionId");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_accountId_idx" ON "InvestmentCashflow"("accountId");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_type_date_idx" ON "InvestmentCashflow"("type", "date");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_investmentId_installmentDueDate_idx" ON "InvestmentCashflow"("investmentId", "installmentDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SanchayapatraConfig_type_key" ON "SanchayapatraConfig"("type");

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedAccess" ADD CONSTRAINT "SharedAccess_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedAccess" ADD CONSTRAINT "SharedAccess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureAccess" ADD CONSTRAINT "FeatureAccess_sharedAccessId_fkey" FOREIGN KEY ("sharedAccessId") REFERENCES "SharedAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialNote" ADD CONSTRAINT "FinancialNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentTypeConfig" ADD CONSTRAINT "InvestmentTypeConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_typeConfigId_fkey" FOREIGN KEY ("typeConfigId") REFERENCES "InvestmentTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_sanchayapatraConfigId_fkey" FOREIGN KEY ("sanchayapatraConfigId") REFERENCES "SanchayapatraConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentReturn" ADD CONSTRAINT "InvestmentReturn_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentValuation" ADD CONSTRAINT "InvestmentValuation_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCashflow" ADD CONSTRAINT "InvestmentCashflow_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCashflow" ADD CONSTRAINT "InvestmentCashflow_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCashflow" ADD CONSTRAINT "InvestmentCashflow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

