-- CreateEnum
CREATE TYPE "AccountDeletionType" AS ENUM ('USER_SELF', 'ADMIN_SOFT', 'ADMIN_PERMANENT');

-- CreateTable
CREATE TABLE "AccountDeletionRecord" (
    "id" TEXT NOT NULL,
    "deletedUserId" TEXT,
    "originalName" TEXT NOT NULL,
    "originalEmail" TEXT NOT NULL,
    "originalRole" "UserRole" NOT NULL,
    "deletionType" "AccountDeletionType" NOT NULL,
    "anonymizedEmail" TEXT,
    "performedById" TEXT,
    "performedByName" TEXT,
    "performedByEmail" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountDeletionRecord_deletedUserId_idx" ON "AccountDeletionRecord"("deletedUserId");

-- CreateIndex
CREATE INDEX "AccountDeletionRecord_originalEmail_idx" ON "AccountDeletionRecord"("originalEmail");

-- CreateIndex
CREATE INDEX "AccountDeletionRecord_deletionType_createdAt_idx" ON "AccountDeletionRecord"("deletionType", "createdAt");

-- CreateIndex
CREATE INDEX "AccountDeletionRecord_performedById_idx" ON "AccountDeletionRecord"("performedById");

-- AddForeignKey
ALTER TABLE "AccountDeletionRecord" ADD CONSTRAINT "AccountDeletionRecord_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
