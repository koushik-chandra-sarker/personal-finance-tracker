-- Phase 2 investment operations: DPS installment state and Sanchayapatra config links.

ALTER TYPE "InvestmentCashflowType" ADD VALUE IF NOT EXISTS 'INSTALLMENT';

ALTER TABLE "Investment"
  ADD COLUMN "installmentDueDay" INTEGER,
  ADD COLUMN "missedInstallmentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastMissedInstallmentOn" TIMESTAMP(3),
  ADD COLUMN "lastInstallmentPaidOn" TIMESTAMP(3),
  ADD COLUMN "sanchayapatraConfigId" TEXT;

UPDATE "Investment"
SET "installmentDueDay" = 5
WHERE "monthlyInstallment" IS NOT NULL
  AND "monthlyInstallment" > 0
  AND "installmentDueDay" IS NULL;

ALTER TABLE "Investment"
  ADD CONSTRAINT "Investment_sanchayapatraConfigId_fkey"
  FOREIGN KEY ("sanchayapatraConfigId") REFERENCES "SanchayapatraConfig"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Investment_sanchayapatraConfigId_idx" ON "Investment"("sanchayapatraConfigId");
