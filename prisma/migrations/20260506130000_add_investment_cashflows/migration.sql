-- CreateEnum
CREATE TYPE "InvestmentCashflowType" AS ENUM (
  'BUY',
  'ADD_FUNDS',
  'RETURN',
  'TAX',
  'FEE',
  'SALE',
  'MATURITY_PAYOUT',
  'REVERSAL'
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
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,

  CONSTRAINT "InvestmentCashflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentCashflow_investmentId_date_idx" ON "InvestmentCashflow"("investmentId", "date");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_transactionId_idx" ON "InvestmentCashflow"("transactionId");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_accountId_idx" ON "InvestmentCashflow"("accountId");

-- CreateIndex
CREATE INDEX "InvestmentCashflow_type_date_idx" ON "InvestmentCashflow"("type", "date");

-- AddForeignKey
ALTER TABLE "InvestmentCashflow" ADD CONSTRAINT "InvestmentCashflow_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCashflow" ADD CONSTRAINT "InvestmentCashflow_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentCashflow" ADD CONSTRAINT "InvestmentCashflow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
