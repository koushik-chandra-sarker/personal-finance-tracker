-- AlterTable
ALTER TABLE "Account" DROP COLUMN "currency";

-- CreateEnum
CREATE TYPE "GoalTransactionType" AS ENUM ('CONTRIBUTION', 'DEDUCTION');

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

-- CreateIndex
CREATE INDEX "GoalProgress_goalId_idx" ON "GoalProgress"("goalId");

-- AddForeignKey
ALTER TABLE "GoalProgress" ADD CONSTRAINT "GoalProgress_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
