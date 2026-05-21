UPDATE "SubscriptionPackage"
SET "trialDays" = 0,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('pro-monthly', 'pro-yearly')
  AND "trialDays" <> 0;

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
  "sortOrder",
  "updatedAt"
) VALUES (
  'pkg_pro_trial',
  'pro-trial',
  'Pro Trial',
  'Try full Pro access before choosing a paid package.',
  'BDT',
  0.00,
  'MONTHLY',
  7,
  'No payment required',
  ARRAY['Full dashboard access during trial', 'No bKash or Nagad payment needed', 'Choose a paid package after trial ends']::TEXT[],
  true,
  false,
  5,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "currency" = EXCLUDED."currency",
  "price" = EXCLUDED."price",
  "interval" = EXCLUDED."interval",
  "trialDays" = EXCLUDED."trialDays",
  "discountLabel" = EXCLUDED."discountLabel",
  "featureBullets" = EXCLUDED."featureBullets",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;
