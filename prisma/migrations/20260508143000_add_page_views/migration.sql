CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");
CREATE INDEX "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt");
CREATE INDEX "PageView_sessionId_createdAt_idx" ON "PageView"("sessionId", "createdAt");
CREATE INDEX "PageView_userId_createdAt_idx" ON "PageView"("userId", "createdAt");

ALTER TABLE "PageView" ADD CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
