-- AlterEnum
ALTER TYPE "Feature" ADD VALUE 'NOTES';

-- CreateEnum
CREATE TYPE "FinancialNoteMode" AS ENUM ('SIMPLE', 'EXTENDED');

-- CreateEnum
CREATE TYPE "FinancialNoteValueType" AS ENUM ('MONEY', 'ASSET', 'MONEY_AND_ASSET', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialNoteStatus" AS ENUM ('OPEN', 'PARTIAL', 'RETURNED', 'CANCELLED');

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

-- CreateIndex
CREATE INDEX "FinancialNote_userId_createdAt_idx" ON "FinancialNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialNote_userId_expectedReturnDate_idx" ON "FinancialNote"("userId", "expectedReturnDate");

-- CreateIndex
CREATE INDEX "FinancialNote_userId_status_idx" ON "FinancialNote"("userId", "status");

-- AddForeignKey
ALTER TABLE "FinancialNote" ADD CONSTRAINT "FinancialNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
