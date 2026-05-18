CREATE TYPE "TaxCategory" AS ENUM ('MALE', 'FEMALE');

CREATE TABLE "TaxConfig" (
  "id" TEXT NOT NULL,
  "fiscalYear" TEXT NOT NULL,
  "category" "TaxCategory" NOT NULL DEFAULT 'MALE',
  "slabIndex" INTEGER NOT NULL,
  "minAmount" DECIMAL(14, 2) NOT NULL,
  "maxAmount" DECIMAL(14, 2),
  "rate" DECIMAL(5, 2) NOT NULL,
  "label" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaxConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaxConfig_fiscalYear_category_slabIndex_key" ON "TaxConfig"("fiscalYear", "category", "slabIndex");
CREATE INDEX "TaxConfig_fiscalYear_category_isActive_idx" ON "TaxConfig"("fiscalYear", "category", "isActive");
