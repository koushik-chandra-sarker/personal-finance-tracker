-- The Tutorial model existed in schema/runtime code without a checked-in migration.
-- Keep this migration idempotent so it can repair existing databases and initialize fresh ones.
CREATE TABLE IF NOT EXISTS "Tutorial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "youtubeUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" TEXT DEFAULT 'General',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutorial_pkey" PRIMARY KEY ("id")
);

ALTER TABLE IF EXISTS "Tutorial"
    ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Tutorial_isActive_sortOrder_idx" ON "Tutorial"("isActive", "sortOrder");
