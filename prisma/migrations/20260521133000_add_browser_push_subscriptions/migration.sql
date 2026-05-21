CREATE TABLE "BrowserPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dhKey" TEXT NOT NULL,
    "authKey" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "BrowserPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrowserPushSubscription_endpoint_key" ON "BrowserPushSubscription"("endpoint");
CREATE INDEX "BrowserPushSubscription_userId_idx" ON "BrowserPushSubscription"("userId");
CREATE INDEX "BrowserPushSubscription_updatedAt_idx" ON "BrowserPushSubscription"("updatedAt");

ALTER TABLE "BrowserPushSubscription" ADD CONSTRAINT "BrowserPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
