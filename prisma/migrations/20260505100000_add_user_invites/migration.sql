CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "packageId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");
CREATE INDEX "UserInvite_acceptedAt_idx" ON "UserInvite"("acceptedAt");

ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
