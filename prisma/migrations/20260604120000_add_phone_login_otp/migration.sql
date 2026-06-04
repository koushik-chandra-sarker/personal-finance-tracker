-- Add phone-first registration support while preserving existing email users.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumber_key" ON "User"("phoneNumber");
CREATE INDEX IF NOT EXISTS "User_phoneNumber_idx" ON "User"("phoneNumber");

CREATE TABLE IF NOT EXISTS "PhoneOtpVerification" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'REGISTER',
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneOtpVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PhoneOtpVerification_phoneNumber_purpose_createdAt_idx" ON "PhoneOtpVerification"("phoneNumber", "purpose", "createdAt");
CREATE INDEX IF NOT EXISTS "PhoneOtpVerification_expiresAt_idx" ON "PhoneOtpVerification"("expiresAt");
CREATE INDEX IF NOT EXISTS "PhoneOtpVerification_verifiedAt_idx" ON "PhoneOtpVerification"("verifiedAt");
