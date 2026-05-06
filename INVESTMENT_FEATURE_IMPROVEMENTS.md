# Investment Feature Analysis And Improvement Suggestions

Date: 2026-05-06
Scope: Current investment implementation in the FinTrack app.

## Executive Summary

The investment module is no longer just a plan. It already has a real product surface: configurable investment types, Bangladesh-focused defaults, portfolio summaries, valuation and return tracking, maturity reminders, reports, dashboard integration, and admin-managed Sanchayapatra rules.

The strongest improvement opportunity is not adding more asset types first. The app should first stabilize the investment flows that affect money movement: type-checking, linked account reconciliation, return payouts, DPS reminders, closing investments, and report/tax accuracy. After that, the feature can grow into richer forecasting, import, and analytics.

## Current Feature Surface

### Data Model

- `InvestmentTypeConfig` gives system and custom investment types dynamic fields such as interest rate, maturity date, monthly installment, quantity, institution, and return types.
- `Investment` tracks principal, current value, status, dates, institution, quantity, monthly installment, and linked account.
- `InvestmentReturn` records realized returns.
- `InvestmentValuation` records value snapshots.
- `SanchayapatraConfig` stores configurable Sanchayapatra rates, tax thresholds, tax rates, and payout frequency.
- `Feature.INVESTMENTS` exists for shared workspace permissions.

Primary files:

- `prisma/schema.prisma`
- `src/services/investment.service.ts`
- `src/services/investment-type.service.ts`
- `src/services/sanchayapatra-config.service.ts`
- `src/services/notification-detector.service.ts`

### User-Facing Pages

- `/investments`: portfolio growth chart, summary cards, allocation pie, filters, investment cards, details modal, valuation tracking, return recording, add funds, close/sell flow, maturity timeline.
- `/investments/types`: custom type management and system type visibility.
- `/dashboard`: investment portfolio widget.
- `/reports`: investment return summary and portfolio health.
- `/admin/investments`: global Sanchayapatra configuration.

## What Is Working Well

- The configurable `InvestmentTypeConfig` model is a good fit for this product. It supports Bangladesh defaults while allowing user-defined instruments without schema changes.
- The built-in types cover the current market context well: Sanchayapatra, FDR, DPS, stock market, mutual funds, bonds, gold, real estate, insurance, and treasury instruments.
- The create/add-funds/close services already attempt to integrate investments with account balances and transactions, which is the right direction for a personal finance tracker.
- The app already includes maturity reminders, DPS reminder logic, reports integration, dashboard integration, and a Sanchayapatra calculator.
- Investment access is wired into the existing workspace and subscription access model through `validateAccess`.

## High-Priority Issues

### 1. TypeScript currently fails

`npx tsc --noEmit` currently fails in the investment area.

Observed errors:

- `InvestmentPageClient` passes handlers like `handleRecordReturn(investmentId, formData)` into `InvestmentDetail`, but `InvestmentDetail` expects callbacks shaped like `(fd: FormData) => Promise<ActionResponse>`. At runtime, return/add-funds/valuation submissions can pass the `FormData` as the investment id and lose the real form data.
- `getPortfolioGrowth` reads `latestValuation.amount`, but the Prisma model field is `InvestmentValuation.value`.
- Investment notification enum errors appear for `INVESTMENT_MATURITY`, `INVESTMENT_RETURN_DUE`, and `INVESTMENT`. Because these values exist in `schema.prisma`, this likely means the generated Prisma client is stale, or the migration/client state is not aligned.

Suggested fixes:

- Wrap detail-modal handlers at the parent boundary:
  - `onRecordReturn={(fd) => handleRecordReturn(viewingInvestment.id, fd)}`
  - `onAddFunds={(fd) => handleAddFunds(viewingInvestment.id, fd)}`
  - `onRecordValuation={(fd) => handleRecordValuation(viewingInvestment.id, fd)}`
- Change `latestValuation.amount` to `latestValuation.value`.
- Run `npx prisma generate`, then rerun `npx tsc --noEmit`.
- Add a lightweight investment action test or integration smoke checklist before future investment edits.

### 2. Investment cashflow is not fully reconciled

The module creates transactions and updates account balances for initial linked investments, add-funds, and closing payouts. But it does not yet maintain a durable relationship between an investment action and the generated transaction.

Current risks:

- Deleting an investment deletes investment rows but does not reverse account balance changes or delete related transactions.
- Updating `investedAmount`, `currentValue`, or `linkedAccountId` does not reconcile existing transactions or account balances.
- `recordReturn` creates an `InvestmentReturn`, but does not create an income transaction or deposit the money into an account.
- `closeInvestment` records the full final value as income, which mixes principal return and profit in normal income reports.
- Closing with `linkedAccountId` does not validate that the account belongs to the user before the raw SQL path.
- `addFunds` increases both invested amount and current value by the same amount, which hides market loss/gain if the current value should stay independently valued.

Suggested fixes:

- Add an explicit investment ledger layer. A practical first model would be `InvestmentCashflow` with fields like:
  - `investmentId`
  - `transactionId`
  - `type`: `BUY`, `ADD_FUNDS`, `RETURN`, `TAX`, `FEE`, `SALE`, `MATURITY_PAYOUT`, `REVERSAL`
  - `amount`
  - `principalAmount`
  - `returnAmount`
  - `taxAmount`
  - `accountId`
  - `date`
  - `createdById`
- For a smaller first pass, add nullable `transactionId` to `InvestmentReturn` and tag generated transactions with a stable internal tag such as `__pft:investment:<investmentId>:<flowType>`.
- Require account selection when recording a paid return, then create the matching income transaction and account deposit.
- On close/sell/maturity, split principal returned from realized gain/loss so reports do not treat the full payout as profit.
- Prevent destructive delete when linked transactions exist, or offer a controlled reversal path.

### 3. DPS reminders can produce false reminders

`detectDPSReminders` checks whether a transaction description contains the investment name. The UI default installment description is currently `Monthly Installment`, which does not include the investment name. That means the detector can miss real payments and keep reminding users.

Suggested fixes:

- Store DPS payment records through the investment ledger instead of inferring from description text.
- If using transactions only, tag the transaction with a stable investment tag and query by tag.
- Add configurable monthly due day per investment.
- Offer a one-click "Pay installment" action from the notification or maturity widget.
- Consider creating a `RecurringTransaction` when a DPS investment is created, but keep it linked to the investment so it does not become a duplicate manual workflow.

### 4. Reporting and tax are too approximate

Reports currently summarize realized returns by return type and investment type, but they do not use valuations, do not separate principal from profit, and estimate tax as a hard-coded 5 percent of all investment returns.

Suggested fixes:

- Use `SanchayapatraConfig` tax fields for Sanchayapatra returns instead of a global hard-coded tax rate.
- Add report sections for:
  - realized returns
  - unrealized gain/loss
  - principal invested
  - principal returned
  - tax withheld
  - fees
  - maturity pipeline
  - DPS installments paid/missed
- Include investment returns and valuations in CSV export, not only normal transactions.
- Add date-range validation to reports so invalid ranges cannot create confusing empty charts.

### 5. Portfolio growth is not yet a true performance chart

The current portfolio growth service uses purchase amount or latest valuation snapshots. It does not account for add-fund timing, return withdrawals, closed investments, or cashflow-adjusted performance.

Suggested fixes:

- First fix the `value` field bug so the current chart works.
- Build monthly portfolio value from:
  - latest valuation per investment by month end
  - active status and close date
  - add-funds cashflows by date
  - realized returns separately from market value
- Add a separate "Net invested over time" line so users can compare deposits against current value.
- Later, add simple yield and money-weighted return. Avoid advanced return metrics until the cashflow ledger is reliable.

## Medium-Priority Product Improvements

### Investment Lifecycle

- Add status guards so users cannot add funds to `MATURED`, `SOLD`, or `CANCELLED` investments.
- Allow editing and deleting individual returns and valuations.
- Add same-day valuation handling. Either allow multiple intraday snapshots intentionally or enforce one valuation per investment per date.
- Allow clearing optional fields like maturity date, institution, and account number during edit.
- Track close reason and use `closedDate` instead of only `soldDate` for matured and cancelled investments.

### Sanchayapatra Experience

- Add an "Apply to investment form" action in the calculator so selected rate, payout frequency, and projected maturity data can populate the form.
- Store which `SanchayapatraConfig` was used for a Sanchayapatra investment. Right now the calculator is separate from the investment record.
- Add payout schedule preview for monthly, quarterly, and maturity payout plans.
- Show expected tax withholding in the return recording flow.

### Custom Investment Types

- Fix the icon picker in `TypeConfigForm`. It uses `<i data-lucide=...>`, but this React app already imports lucide components elsewhere.
- Add slug normalization from name so users do not have to type perfect lowercase underscores.
- Add return type creation for custom labels, or make it clear that users must select from the existing return type list.
- Show which fields are enabled on each type card for easier scanning.

### UI And UX

- Remove the bottom "Portfolio Growth will be implemented in Phase 5" placeholder because the page already has a growth chart at the top.
- Make investment card actions visible on mobile and keyboard focus, not only on hover.
- Add `CANCELLED` to the status filter options.
- Add clear empty states for no valuation data, no returns, no account selected, and insufficient balance.
- Replace `window.location.reload()` in `SanchayapatraAdminClient` with state updates plus `router.refresh()`.
- Add route-level loading for `/investments/types` if navigation feels slower than the rest of the dashboard.

### Admin And Permissions

- Protect `/admin/investments` with an admin-role check, not only `validateAccess('SETTINGS', 'EDIT')`, because Sanchayapatra config is global app configuration.
- Keep personal investment type management under `/investments/types`; keep global Sanchayapatra rules under `/admin/investments`.
- Add audit metadata for Sanchayapatra config changes if this app will have multiple admins.

## Suggested Implementation Roadmap

### Phase 0: Stabilize The Existing Feature

Priority: urgent.
Status: implemented on 2026-05-06.

- [x] Fix all current `npx tsc --noEmit` investment errors.
- [x] Regenerate Prisma client and verify notification enums.
- [x] Fix the detail-modal callback wiring.
- [x] Fix `InvestmentValuation.value` usage in portfolio growth.
- [x] Validate close payout account ownership before raw SQL or move close flow into a Prisma transaction.
- [x] Add status guards for add-funds, returns, valuations, and closing.

### Phase 1: Reconcile Cashflow Correctly

Priority: high.

- Add an investment cashflow model or stable transaction links/tags.
- Link generated buy, add-funds, return, sale, maturity, tax, and fee transactions to the investment.
- Make return recording optionally or requiredly deposit to an account.
- Split close payout into principal and gain/loss.
- Restrict deletes when linked financial history exists.

### Phase 2: Make DPS And Sanchayapatra Operational

Priority: high.

- Replace DPS description matching with ledger/tag matching.
- Add installment due day and missed-payment state.
- Add one-click pay installment from reminders.
- Store selected Sanchayapatra config on investments.
- Generate projected payout and maturity schedules.

### Phase 3: Upgrade Reports

Priority: medium.

- Report realized vs unrealized return separately.
- Use configured tax rates by instrument/config.
- Export investment returns, valuations, and cashflows.
- Add maturity forecast and cashflow forecast views.

### Phase 4: Polish The Investment UX

Priority: medium.

- Fix custom type icon rendering.
- Make card actions mobile-friendly.
- Remove duplicate/obsolete placeholders.
- Improve admin config refresh behavior.
- Add better form help for account effects, returns, taxes, and maturity.

### Phase 5: Advanced Features Later

Priority: later.

- CSV import for broker, DSE/CSE, mutual fund, or bank statements.
- Manual quote history import for stocks, mutual funds, gold, and foreign currency.
- Multi-currency investment support with exchange-rate snapshots.
- Attach documents or notes to investments, such as certificates, BO account docs, or policy documents.
- Optional goal linking, for example "this DPS funds the child's education goal."

## Recommended Next Step

Start with Phase 0 and Phase 1 together. The investment feature already has enough UI. The next best improvement is making every money movement traceable, reversible, and reportable. Once that foundation is reliable, DPS automation, Sanchayapatra projections, and better reports will be much easier to build without rework.
