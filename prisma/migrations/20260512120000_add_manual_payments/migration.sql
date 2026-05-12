CREATE TYPE "ManualPaymentProvider" AS ENUM ('BKASH', 'NAGAD');

CREATE TYPE "ManualPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ManualPaymentMethod" (
    "id" TEXT NOT NULL,
    "provider" "ManualPaymentProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManualPaymentRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "methodId" TEXT,
    "provider" "ManualPaymentProvider" NOT NULL,
    "status" "ManualPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "reference" TEXT NOT NULL,
    "senderAccount" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "screenshotUrl" TEXT,
    "note" TEXT,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualPaymentMethod_provider_isActive_idx" ON "ManualPaymentMethod"("provider", "isActive");
CREATE INDEX "ManualPaymentMethod_isActive_sortOrder_idx" ON "ManualPaymentMethod"("isActive", "sortOrder");
CREATE UNIQUE INDEX "ManualPaymentRequest_provider_transactionId_key" ON "ManualPaymentRequest"("provider", "transactionId");
CREATE INDEX "ManualPaymentRequest_userId_status_createdAt_idx" ON "ManualPaymentRequest"("userId", "status", "createdAt");
CREATE INDEX "ManualPaymentRequest_status_createdAt_idx" ON "ManualPaymentRequest"("status", "createdAt");
CREATE INDEX "ManualPaymentRequest_packageId_idx" ON "ManualPaymentRequest"("packageId");
CREATE INDEX "ManualPaymentRequest_methodId_idx" ON "ManualPaymentRequest"("methodId");

ALTER TABLE "ManualPaymentRequest" ADD CONSTRAINT "ManualPaymentRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManualPaymentRequest" ADD CONSTRAINT "ManualPaymentRequest_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ManualPaymentRequest" ADD CONSTRAINT "ManualPaymentRequest_methodId_fkey"
  FOREIGN KEY ("methodId") REFERENCES "ManualPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManualPaymentRequest" ADD CONSTRAINT "ManualPaymentRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
