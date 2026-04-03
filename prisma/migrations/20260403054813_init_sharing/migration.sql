-- CreateEnum
CREATE TYPE "Feature" AS ENUM ('TRANSACTIONS', 'ACCOUNTS', 'BUDGETS', 'GOALS', 'REPORTS', 'SETTINGS');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('NONE', 'VIEW', 'EDIT');

-- CreateTable
CREATE TABLE "SharedAccess" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureAccess" (
    "id" TEXT NOT NULL,
    "sharedAccessId" TEXT NOT NULL,
    "feature" "Feature" NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "FeatureAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedAccess_ownerId_idx" ON "SharedAccess"("ownerId");

-- CreateIndex
CREATE INDEX "SharedAccess_collaboratorId_idx" ON "SharedAccess"("collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedAccess_ownerId_collaboratorId_key" ON "SharedAccess"("ownerId", "collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureAccess_sharedAccessId_feature_key" ON "FeatureAccess"("sharedAccessId", "feature");

-- AddForeignKey
ALTER TABLE "SharedAccess" ADD CONSTRAINT "SharedAccess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedAccess" ADD CONSTRAINT "SharedAccess_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureAccess" ADD CONSTRAINT "FeatureAccess_sharedAccessId_fkey" FOREIGN KEY ("sharedAccessId") REFERENCES "SharedAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
