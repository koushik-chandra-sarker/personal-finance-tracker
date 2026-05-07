-- Track which monthly DPS installment a cashflow pays, so arrears can be paid
-- in the same calendar month without duplicating the same due installment.

ALTER TABLE "InvestmentCashflow"
  ADD COLUMN "installmentDueDate" TIMESTAMP(3);

UPDATE "InvestmentCashflow" cf
SET "installmentDueDate" = make_date(
    EXTRACT(YEAR FROM cf."date")::int,
    EXTRACT(MONTH FROM cf."date")::int,
    LEAST(
      COALESCE(i."installmentDueDay", 5),
      EXTRACT(DAY FROM (date_trunc('month', cf."date") + INTERVAL '1 month - 1 day'))::int
    )
  )::timestamp
FROM "Investment" i
WHERE cf."investmentId" = i."id"
  AND cf."type" = 'INSTALLMENT'::"InvestmentCashflowType"
  AND cf."installmentDueDate" IS NULL;

CREATE INDEX "InvestmentCashflow_investmentId_installmentDueDate_idx"
  ON "InvestmentCashflow"("investmentId", "installmentDueDate");

CREATE UNIQUE INDEX "InvestmentCashflow_installment_due_unique_idx"
  ON "InvestmentCashflow"("investmentId", "installmentDueDate")
  WHERE "type" = 'INSTALLMENT'::"InvestmentCashflowType"
    AND "installmentDueDate" IS NOT NULL;
