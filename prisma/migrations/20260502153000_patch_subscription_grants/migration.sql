-- Patch installations where the earlier roles/subscriptions migration was applied
-- before admin grant fields were introduced.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionSource') THEN
    CREATE TYPE "SubscriptionSource" AS ENUM ('SELF_SERVICE', 'ADMIN_GRANT');
  END IF;
END $$;

ALTER TABLE "UserSubscription"
ADD COLUMN IF NOT EXISTS "source" "SubscriptionSource" NOT NULL DEFAULT 'SELF_SERVICE',
ADD COLUMN IF NOT EXISTS "grantedById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserSubscription_grantedById_fkey'
  ) THEN
    ALTER TABLE "UserSubscription"
    ADD CONSTRAINT "UserSubscription_grantedById_fkey"
    FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Ensure existing installations have one admin.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE NOT EXISTS (
  SELECT 1 FROM "User" WHERE "role" = 'ADMIN'
)
AND "id" = (
  SELECT "id"
  FROM "User"
  ORDER BY "createdAt" ASC
  LIMIT 1
);
