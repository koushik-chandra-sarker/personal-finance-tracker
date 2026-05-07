
-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ACTIVE', 'MATURED', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'AT_MATURITY', 'ON_SALE');

-- AlterEnum
ALTER TYPE "Feature" ADD VALUE 'INVESTMENTS';
ALTER TYPE "NotificationType" ADD VALUE 'INVESTMENT_MATURITY';
ALTER TYPE "NotificationType" ADD VALUE 'INVESTMENT_RETURN_DUE';
ALTER TYPE "NotificationSource" ADD VALUE 'INVESTMENT';

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
    "quantity" DECIMAL(14,4),
    "avgBuyPrice" DECIMAL(14,4),
    "notes" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'trending-up',
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
CREATE INDEX "InvestmentReturn_investmentId_date_idx" ON "InvestmentReturn"("investmentId", "date");

-- CreateIndex
CREATE INDEX "InvestmentValuation_investmentId_date_idx" ON "InvestmentValuation"("investmentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SanchayapatraConfig_type_key" ON "SanchayapatraConfig"("type");

-- AddForeignKey
ALTER TABLE "InvestmentTypeConfig" ADD CONSTRAINT "InvestmentTypeConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_typeConfigId_fkey" FOREIGN KEY ("typeConfigId") REFERENCES "InvestmentTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentReturn" ADD CONSTRAINT "InvestmentReturn_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentValuation" ADD CONSTRAINT "InvestmentValuation_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
