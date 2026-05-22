CREATE TYPE "UserExperienceMode" AS ENUM ('BASIC', 'FULL');

ALTER TABLE "User"
ADD COLUMN "experienceMode" "UserExperienceMode" NOT NULL DEFAULT 'FULL',
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

UPDATE "User"
SET "onboardingCompletedAt" = COALESCE("onboardingCompletedAt", CURRENT_TIMESTAMP);
