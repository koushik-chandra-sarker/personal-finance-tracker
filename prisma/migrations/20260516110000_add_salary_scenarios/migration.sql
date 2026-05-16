ALTER TYPE "Feature" ADD VALUE IF NOT EXISTS 'SALARY_PLANNER';

CREATE TABLE "SalaryScenario" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fiscalYear" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "taxCategory" TEXT NOT NULL DEFAULT 'male',
  "grossMonthly" DECIMAL(12, 2) NOT NULL,
  "bonusMonths" INTEGER NOT NULL DEFAULT 2,
  "structure" JSONB NOT NULL,
  "deductions" JSONB NOT NULL,
  "budgetRule" TEXT NOT NULL DEFAULT '50-30-20',
  "budgetCategories" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalaryScenario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalaryScenario_userId_updatedAt_idx" ON "SalaryScenario"("userId", "updatedAt");

ALTER TABLE "SalaryScenario"
  ADD CONSTRAINT "SalaryScenario_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
