ALTER TABLE "AdminMessage"
ADD COLUMN "browserPushEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "browserPushDaily" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AdminMessageState"
ADD COLUMN "browserPushSentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "browserPushLastSentAt" TIMESTAMP(3);

CREATE INDEX "AdminMessageState_userId_browserPushLastSentAt_idx" ON "AdminMessageState"("userId", "browserPushLastSentAt");
