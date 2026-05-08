CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "currentPath" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserActivity_userId_sessionId_key" ON "UserActivity"("userId", "sessionId");
CREATE INDEX "UserActivity_lastSeenAt_idx" ON "UserActivity"("lastSeenAt");
CREATE INDEX "UserActivity_currentPath_lastSeenAt_idx" ON "UserActivity"("currentPath", "lastSeenAt");
CREATE INDEX "UserActivity_userId_lastSeenAt_idx" ON "UserActivity"("userId", "lastSeenAt");

ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
