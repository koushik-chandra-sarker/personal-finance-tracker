ALTER TABLE "User"
ADD COLUMN "financialMonthStartDay" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "User"
ADD CONSTRAINT "User_financialMonthStartDay_check"
CHECK ("financialMonthStartDay" BETWEEN 1 AND 31);
