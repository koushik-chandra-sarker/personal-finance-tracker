-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_createdById_fkey";

-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_updatedById_fkey";
