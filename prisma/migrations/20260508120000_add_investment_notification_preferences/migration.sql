ALTER TABLE "NotificationPreference"
  ADD COLUMN IF NOT EXISTS "investmentMaturityEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "investmentReminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS "dpsReminderEnabled" BOOLEAN NOT NULL DEFAULT true;
