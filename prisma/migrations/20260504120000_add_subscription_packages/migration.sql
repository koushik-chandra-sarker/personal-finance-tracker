CREATE TABLE "SubscriptionPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "price" DECIMAL(12,2) NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "discountLabel" TEXT,
    "featureBullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPackage_slug_key" ON "SubscriptionPackage"("slug");
CREATE INDEX "SubscriptionPackage_isActive_sortOrder_idx" ON "SubscriptionPackage"("isActive", "sortOrder");
CREATE INDEX "SubscriptionPackage_interval_idx" ON "SubscriptionPackage"("interval");

ALTER TABLE "UserSubscription" ADD COLUMN "packageId" TEXT;
CREATE INDEX "UserSubscription_packageId_idx" ON "UserSubscription"("packageId");

ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SubscriptionPackage" (
  "id",
  "slug",
  "name",
  "description",
  "currency",
  "price",
  "interval",
  "trialDays",
  "discountLabel",
  "featureBullets",
  "isActive",
  "isFeatured",
  "sortOrder"
) VALUES
  (
    'pkg_pro_monthly',
    'pro-monthly',
    'Pro Monthly',
    'Flexible full access renewed monthly.',
    'BDT',
    999.00,
    'MONTHLY',
    0,
    NULL,
    ARRAY['Full dashboard access', 'Collaborator workspaces', 'Cancel before next billing cycle']::TEXT[],
    true,
    false,
    10
  ),
  (
    'pkg_pro_yearly',
    'pro-yearly',
    'Pro Yearly',
    'Best value for long-term finance tracking.',
    'BDT',
    9990.00,
    'YEARLY',
    0,
    'Save compared with monthly billing',
    ARRAY['Full dashboard access', 'Collaborator workspaces', 'Lower yearly price']::TEXT[],
    true,
    true,
    20
  )
ON CONFLICT ("slug") DO NOTHING;
