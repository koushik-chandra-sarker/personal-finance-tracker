-- Add a category link so automatically generated subscription payments
-- can be classified in the user's expense reports.
ALTER TABLE "PersonalSubscription" ADD COLUMN "categoryId" TEXT;

CREATE INDEX "PersonalSubscription_categoryId_idx" ON "PersonalSubscription"("categoryId");

ALTER TABLE "PersonalSubscription" ADD CONSTRAINT "PersonalSubscription_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
