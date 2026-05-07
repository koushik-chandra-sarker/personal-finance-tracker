# Investment Management Plan — Bangladesh Perspective

## 1. Overview

Add a full **Investment Portfolio** module to the Personal Finance Tracker that supports the investment instruments commonly used in Bangladesh. The module ships with **10 built-in instrument types** as defaults, but users can also **create unlimited custom investment types** with dynamic field configuration. This lets users track purchases, maturity, returns, and overall portfolio health — all integrated with the existing account, transaction, and reporting systems.

---

## 2. Bangladesh Investment Instruments

| # | Instrument | Category | Return Type | Typical Tenure |
|---|-----------|----------|-------------|----------------|
| 1 | **Sanchayapatra** (National Savings Certificates) — Poribar, Pensioner, 3-Monthly Profit, 5-Year BD | `GOVT_SAVINGS` | Fixed interest, periodic payout | 3–5 years |
| 2 | **Fixed Deposit (FDR)** | `FIXED_DEPOSIT` | Fixed interest at maturity or periodic | 3 months – 5 years |
| 3 | **DPS (Deposit Pension Scheme)** | `DPS` | Monthly installment → lump sum at maturity | 5–10 years |
| 4 | **Stock Market (DSE/CSE)** | `STOCK` | Capital gain + dividends | Open-ended |
| 5 | **Mutual Funds (Open/Closed-end)** | `MUTUAL_FUND` | NAV growth + dividends | Open-ended / fixed |
| 6 | **Government / Corporate Bonds** | `BOND` | Coupon payments | 2–20 years |
| 7 | **Gold / Precious Metals** | `GOLD` | Market price appreciation | Open-ended |
| 8 | **Real Estate / Land** | `REAL_ESTATE` | Rental income + appreciation | Long-term |
| 9 | **Life Insurance (Endowment/ULIP)** | `INSURANCE` | Maturity benefit | 10–20 years |
| 10 | **Treasury Bills / Bonds (Bangladesh Bank)** | `TREASURY` | Discount / coupon | 91 days – 20 years |

---

## 3. Database Schema

### 3.1 New Enums

```prisma
enum InvestmentStatus {
  ACTIVE
  MATURED
  SOLD
  CANCELLED
}

enum ReturnFrequency {
  MONTHLY
  QUARTERLY
  HALF_YEARLY
  YEARLY
  AT_MATURITY
  ON_SALE
}
```

> [!IMPORTANT]
> `InvestmentType` is **NOT** a Prisma enum. Instead, each investment references an `InvestmentTypeConfig` row via `typeConfigId`. This allows users to add custom types without schema migrations.

### 3.2 Dynamic Type Configuration Model

```prisma
model InvestmentTypeConfig {
  id              String       @id @default(cuid())
  userId          String?      // null = system default, non-null = user-created
  slug            String       // e.g. "govt_savings", "my_crypto"
  name            String       // e.g. "Sanchayapatra", "Cryptocurrency"
  description     String?      // Help text shown in the UI
  icon            String       @default("trending-up")
  color           String       @default("#6366f1")
  isSystem        Boolean      @default(false) // true for the 10 built-in types
  isActive        Boolean      @default(true)
  sortOrder       Int          @default(0)

  // Dynamic field visibility flags — controls which fields appear in the form
  hasInterestRate       Boolean @default(false)
  hasReturnFrequency    Boolean @default(false)
  hasMaturityDate       Boolean @default(true)
  hasMonthlyInstallment Boolean @default(false)
  hasQuantity           Boolean @default(false)  // quantity + avg buy price
  hasInstitution        Boolean @default(true)
  hasAccountNumber      Boolean @default(true)

  // Default return types for this instrument
  returnTypes     String[]     @default([])  // e.g. ["INTEREST"], ["DIVIDEND", "CAPITAL_GAIN"]

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  user            User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  investments     Investment[]

  @@unique([userId, slug])
  @@index([userId, isActive])
}
```

**Seeded System Defaults (10 types):**

| slug | name | Key Fields Enabled | Return Types |
|------|------|-------------------|---------------|
| `govt_savings` | Sanchayapatra | interestRate, returnFrequency, maturityDate | INTEREST |
| `fixed_deposit` | Fixed Deposit (FDR) | interestRate, returnFrequency, maturityDate | INTEREST |
| `dps` | DPS | interestRate, maturityDate, monthlyInstallment | INTEREST |
| `stock` | Stock Market | quantity | DIVIDEND, CAPITAL_GAIN |
| `mutual_fund` | Mutual Fund | quantity | DIVIDEND, CAPITAL_GAIN |
| `bond` | Bond | interestRate, returnFrequency, maturityDate | COUPON |
| `gold` | Gold / Precious Metals | quantity | CAPITAL_GAIN |
| `real_estate` | Real Estate | — | RENTAL, CAPITAL_GAIN |
| `insurance` | Life Insurance | interestRate, maturityDate, monthlyInstallment | MATURITY_BENEFIT |
| `treasury` | Treasury Bill/Bond | interestRate, returnFrequency, maturityDate | COUPON |

### 3.3 Core Models

```prisma
model Investment {
  id                String             @id @default(cuid())
  userId            String
  typeConfigId      String             // references InvestmentTypeConfig
  name              String             // e.g. "5-Year BD Sanchayapatra", "BRAC Bank FDR"
  status            InvestmentStatus   @default(ACTIVE)
  institutionName   String?            // Bank / broker / issuer
  accountNumber     String?            // Certificate / folio / account no.

  // Financial
  investedAmount    Decimal            @db.Decimal(14, 2)
  currentValue      Decimal            @db.Decimal(14, 2)  // latest valuation
  interestRate      Decimal?           @db.Decimal(6, 3)   // annual %
  returnFrequency   ReturnFrequency?

  // Dates
  purchaseDate      DateTime
  maturityDate      DateTime?
  soldDate          DateTime?

  // Linked PFT account used for buy/sell cash flow
  linkedAccountId   String?

  // DPS-specific
  monthlyInstallment Decimal?          @db.Decimal(14, 2)

  // Stock / MF specific
  quantity          Decimal?           @db.Decimal(14, 4)
  avgBuyPrice       Decimal?           @db.Decimal(14, 4)

  notes             String?
  color             String             @default("#6366f1")
  icon              String             @default("trending-up")

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  createdById       String?
  updatedById       String?

  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  typeConfig        InvestmentTypeConfig @relation(fields: [typeConfigId], references: [id])
  linkedAccount     Account?           @relation(fields: [linkedAccountId], references: [id], onDelete: SetNull)
  returns           InvestmentReturn[]
  valuations        InvestmentValuation[]

  @@index([userId, typeConfigId])
  @@index([userId, status])
  @@index([userId, maturityDate])
}

model InvestmentReturn {
  id            String     @id @default(cuid())
  investmentId  String
  amount        Decimal    @db.Decimal(14, 2)
  type          String     // INTEREST, DIVIDEND, COUPON, RENTAL, CAPITAL_GAIN
  description   String?
  date          DateTime
  createdAt     DateTime   @default(now())

  investment    Investment @relation(fields: [investmentId], references: [id], onDelete: Cascade)

  @@index([investmentId, date])
}

model InvestmentValuation {
  id            String     @id @default(cuid())
  investmentId  String
  value         Decimal    @db.Decimal(14, 2)
  date          DateTime
  createdAt     DateTime   @default(now())

  investment    Investment @relation(fields: [investmentId], references: [id], onDelete: Cascade)

  @@index([investmentId, date])
}
```

### 3.4 Schema Changes to Existing Models

```prisma
// User model — add relations
investments         Investment[]
investmentTypeConfigs InvestmentTypeConfig[]

// Feature enum — add value
INVESTMENTS

// NotificationType — add values
INVESTMENT_MATURITY
INVESTMENT_RETURN_DUE

// NotificationSource — add value
INVESTMENT
```

---

## 4. Architecture (follows existing patterns)

### 4.1 Files to Create

| Layer | File | Purpose |
|-------|------|---------|
| Service | `src/services/investment.service.ts` | CRUD, valuation, return recording, maturity checks |
| Service | `src/services/investment-type.service.ts` | Type config CRUD, seed defaults, field visibility |
| Action | `src/actions/investment.actions.ts` | Server actions wrapping service calls |
| Action | `src/actions/investment-type.actions.ts` | Type config management actions |
| Page | `src/app/(dashboard)/investments/page.tsx` | Server component — data fetch |
| Page | `src/app/(dashboard)/investments/types/page.tsx` | Manage custom investment types |
| Client | `src/components/investments/InvestmentPageClient.tsx` | Main client page with filters & list |
| Client | `src/components/investments/InvestmentForm.tsx` | Dynamic create/edit form driven by type config |
| Client | `src/components/investments/InvestmentCard.tsx` | Single investment card |
| Client | `src/components/investments/InvestmentDetail.tsx` | Detail view with returns & valuations |
| Client | `src/components/investments/PortfolioSummary.tsx` | Total invested, current value, gain/loss |
| Client | `src/components/investments/PortfolioChart.tsx` | Allocation pie chart + growth line chart |
| Client | `src/components/investments/MaturityTimeline.tsx` | Upcoming maturities timeline |
| Client | `src/components/investments/TypeConfigForm.tsx` | Create/edit custom investment types |
| Client | `src/components/investments/TypeConfigList.tsx` | List & manage investment types |

### 4.2 Service Layer Outline

```
investment.service.ts
├── getInvestments(userId, filters?)
├── getInvestmentById(userId, id)
├── createInvestment(userId, executorId, data)
├── updateInvestment(userId, executorId, id, data)
├── deleteInvestment(userId, id)
├── recordReturn(userId, executorId, investmentId, data)
├── recordValuation(userId, investmentId, data)
├── getPortfolioSummary(userId)
├── getPortfolioAllocation(userId)
├── getUpcomingMaturities(userId, daysAhead)
└── markAsMatured(userId, executorId, id)

investment-type.service.ts
├── getTypeConfigs(userId)          // system defaults + user's custom types
├── createTypeConfig(userId, data)  // user creates a new type
├── updateTypeConfig(userId, id, data)
├── deleteTypeConfig(userId, id)    // only user-created, not system
└── seedSystemDefaults()            // called on first setup
```

---

## 5. Key Features

### 5.1 Portfolio Dashboard
- **Total Invested** / **Current Value** / **Total Returns** / **Unrealised Gain/Loss** summary cards
- **Allocation Pie Chart** — breakdown by `InvestmentType`
- **Growth Line Chart** — portfolio value over time from `InvestmentValuation` snapshots
- **Upcoming Maturities** — card list of investments maturing in the next 90 days

### 5.2 Investment CRUD
- **Dynamic form** driven by `InvestmentTypeConfig` flags — when user selects a type, only the relevant fields appear (e.g. `hasMonthlyInstallment` → shows installment field; `hasQuantity` → shows quantity + avg buy price)
- Works identically for built-in AND custom types — no code changes needed to support new types
- Link to an existing PFT `Account` so buy/sell transactions auto-create entries (same CTE pattern as Goals)
- Auto-create `Investment Purchases` (EXPENSE) and `Investment Sales` (INCOME) categories

### 5.3 Custom Investment Type Management
- **"Manage Types"** page accessible from the investments section
- Users can create types like "Cryptocurrency", "Peer-to-Peer Lending", "Cooperative Shares", "Foreign Currency" etc.
- Configure which fields are relevant via toggle switches (interest rate, quantity, maturity date, etc.)
- Set custom icon (from lucide-react picker) and color
- Define applicable return types (e.g. INTEREST, DIVIDEND, STAKING_REWARD)
- System default types are read-only but can be hidden (set `isActive = false`)
- Custom types can be edited or deleted (only if no investments reference them)

### 5.4 Return & Valuation Tracking
- Record periodic returns — return type dropdown populated from the type config's `returnTypes` array
- Optionally auto-create an INCOME transaction when a return is recorded
- Manual or periodic valuation updates for market-based instruments (stocks, gold, MF)

### 5.5 Maturity Notifications
- Reuse `notification-detector.service.ts` pattern
- Alert **30 days** and **7 days** before maturity
- Alert when DPS installment is due (monthly)

### 5.6 Sanchayapatra Calculator
- Built-in profit calculator for all 4 Sanchayapatra types with current rates
- Show projected payout schedule at purchase time

### 5.7 Reports Integration
- Add "Investment" section to the existing Reports page
- Year-wise return summary
- Tax-related: Sanchayapatra source tax (10%), FDR source tax (varies)

---

## 6. UI/UX Design Notes

- Follow the existing card-based layout used by Goals and Accounts pages
- Use `lucide-react` icons: `trending-up`, `landmark`, `banknote`, `coins`, `building-2`, `shield`, `bar-chart-3`
- Color-code by instrument type for quick visual scanning
- Mobile-first responsive grid (1 col mobile → 2 col tablet → 3 col desktop)
- Filters: by type, status, institution, date range
- Use `recharts` for portfolio charts (consistent with existing dashboard)

---

## 7. Phased Rollout

### Phase 1 — Schema, Type Config & Core CRUD *(~4-5 days)*
- [ ] Prisma schema migration (enums + 4 new models + User relations)
- [ ] Seed script for 10 system default type configs
- [ ] `investment-type.service.ts` — type config CRUD
- [ ] `investment.service.ts` — investment CRUD + portfolio summary
- [ ] Server actions for both services
- [ ] Investment list page with filters (by type, status)
- [ ] **Dynamic form** — renders fields based on selected type config
- [ ] Portfolio summary cards + allocation pie chart
- [ ] Navigation menu update

### Phase 2 — Custom Types & Dynamic Fields *(~2-3 days)*
- [ ] "Manage Investment Types" page
- [ ] Type config create/edit form with field toggles
- [ ] Icon & color picker for custom types
- [ ] Return type configuration (multi-select)
- [ ] Hide/show system defaults

### Phase 3 — Returns, Valuations & Transactions *(~2-3 days)*
- [ ] Record return flow (return types driven by config)
- [ ] Record valuation flow
- [ ] Investment detail page (returns history, valuation chart)
- [ ] Auto-create linked transaction categories
- [ ] Growth line chart on portfolio page

### Phase 4 — Notifications & Maturity *(~1-2 days)*
- [x] Maturity notification detector
- [x] DPS installment reminder
- [x] Maturity timeline component
- [x] Mark-as-matured / sold workflow

### Phase 5 — Advanced Features *(~2-3 days)*
- [x] Sanchayapatra profit calculator
- [x] Reports page integration (annual returns, tax summary)
- [x] Shared access (INVESTMENTS feature permission)
- [x] Dashboard widget (top investments, upcoming maturities)

---

## 8. Sanchayapatra Current Rates (as of 2025–2026)

| Type | Tenure | Interest Rate | Payout | Min Investment | Source Tax |
|------|--------|--------------|--------|----------------|------------|
| 5-Year Bangladesh Sanchayapatra | 5 years | 11.28% | At maturity | ৳10,000 | 10% |
| 3-Monthly Profit Sanchayapatra | 3 years | 11.04% | Quarterly | ৳1,00,000 | 10% |
| Poribar Sanchayapatra | 5 years | 11.52% | 3-monthly | ৳10,000 | 10% |
| Pensioner Sanchayapatra | 5 years | 11.76% | 3-monthly | ৳50,000 | 10% |

> [!NOTE]
> Rates should be configurable / updatable as Bangladesh Bank revises them periodically.

---

## 9. Open Questions

1. **Should stock prices auto-fetch?** — DSE has no free public API. Manual entry may be the only viable option initially. We could add CSV import for DSE portfolio statements later.
2. **Multi-currency support?** — Some users may hold USD-denominated bonds or foreign investments. Current schema supports BDT only via the user's currency setting.
3. **Tax report generation?** — Bangladesh requires reporting investment income for tax returns. Should we generate a summary aligned with the NBR (National Board of Revenue) format?
4. **Should DPS installments create recurring transactions?** — We could auto-link a `RecurringTransaction` when a DPS investment is created.

---

## 10. Summary

This plan adds a full investment tracking module with **10 built-in Bangladesh instrument types** plus **unlimited user-defined custom types** via `InvestmentTypeConfig`. The schema consists of **4 new models** (InvestmentTypeConfig, Investment, InvestmentReturn, InvestmentValuation) with a **5-phase rollout** estimated at **11–16 days**. Dynamic form rendering is driven entirely by type configuration flags, meaning adding a new instrument type requires **zero code changes**. It reuses existing patterns (Goals service CTE pattern, notification detector, Recharts charts, card-based UI) for consistency.
