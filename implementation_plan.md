# Personal Finance Management Web App — Implementation Plan

## Overview

A production-ready, full-featured Personal Finance Tracker built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Neon PostgreSQL**, **Prisma ORM**, **NextAuth v5 (JWT)**, **React Hook Form + Zod**, and **Recharts**. The app supports multi-account tracking, budgeting, recurring transactions, savings goals, reports, and AI-based spending insights.

---

## User Review Required

> [!IMPORTANT]
> **Neon Database:** You will need a Neon PostgreSQL database. The app will be configured to read `DATABASE_URL` and `DIRECT_URL` from `.env`. You'll need to provide your own Neon connection strings after scaffolding.

> [!IMPORTANT]
> **NextAuth Secret:** A `NEXTAUTH_SECRET` environment variable is required. We'll generate a placeholder you must replace in production.

> [!WARNING]
> **This is a large build.** The plan is broken into phases. I will build all phases sequentially after approval. Estimated ~80+ files.

---

## Project Structure

```
/media/koushik/Personal/Woe/pft/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (providers, fonts, theme)
│   │   ├── page.tsx                    # Landing / redirect to dashboard
│   │   ├── globals.css                 # Tailwind + custom styles
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar + topbar layout
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── budgets/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   ├── recurring/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── ui/                         # Reusable primitives (Button, Input, Card, Modal, etc.)
│   │   ├── layout/                     # Sidebar, Topbar, ThemeToggle
│   │   ├── dashboard/                  # Dashboard widgets, charts
│   │   ├── transactions/               # Transaction form, list, filters
│   │   ├── accounts/                   # Account cards, forms
│   │   ├── budgets/                    # Budget cards, progress bars
│   │   ├── goals/                      # Goal cards, progress
│   │   ├── reports/                    # Report charts, export button
│   │   └── providers/                  # SessionProvider, ThemeProvider, QueryProvider
│   ├── lib/
│   │   ├── prisma.ts                   # Prisma client singleton (Neon adapter)
│   │   ├── auth.ts                     # NextAuth config
│   │   ├── utils.ts                    # Utility helpers (cn, formatCurrency, etc.)
│   │   └── validations/               # Zod schemas
│   │       ├── auth.ts
│   │       ├── transaction.ts
│   │       ├── budget.ts
│   │       ├── account.ts
│   │       ├── goal.ts
│   │       └── recurring.ts
│   ├── services/                       # Business logic layer
│   │   ├── transaction.service.ts
│   │   ├── budget.service.ts
│   │   ├── account.service.ts
│   │   ├── goal.service.ts
│   │   ├── recurring.service.ts
│   │   ├── report.service.ts
│   │   ├── insight.service.ts          # AI spending insights
│   │   └── notification.service.ts
│   ├── actions/                        # Server Actions
│   │   ├── auth.actions.ts
│   │   ├── transaction.actions.ts
│   │   ├── budget.actions.ts
│   │   ├── account.actions.ts
│   │   ├── goal.actions.ts
│   │   └── recurring.actions.ts
│   ├── hooks/                          # Custom React hooks
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   └── types/                          # TypeScript types
│       └── index.ts
├── public/
├── .env.example
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Phase 1: Project Scaffolding

### Next.js Setup
- `npx -y create-next-app@latest ./ --ts --tailwind --app --src-dir --use-npm --yes`
- Install all dependencies

### Dependencies
```bash
# Core
npm install prisma @prisma/client @prisma/adapter-neon @neondatabase/serverless ws
npm install next-auth@beta bcryptjs
npm install react-hook-form @hookform/resolvers zod
npm install recharts
npm install clsx tailwind-merge
npm install lucide-react           # Icons
npm install date-fns               # Date utilities
npm install next-themes             # Dark/light mode

# Dev
npm install -D @types/bcryptjs @types/ws prisma
```

---

## Phase 2: Database Schema (Prisma)

### [NEW] `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id             String               @id @default(cuid())
  name           String
  email          String               @unique
  password       String
  currency       String               @default("USD")
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  accounts       Account[]
  categories     Category[]
  transactions   Transaction[]
  budgets        Budget[]
  goals          Goal[]
  recurringTxns  RecurringTransaction[]
  notifications  Notification[]
}

model Account {
  id           String        @id @default(cuid())
  userId       String
  name         String
  type         AccountType
  balance      Decimal       @default(0) @db.Decimal(12, 2)
  currency     String        @default("USD")
  color        String        @default("#6366f1")
  icon         String        @default("wallet")
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@index([userId])
}

enum AccountType {
  CASH
  BANK
  MOBILE_WALLET
  CREDIT_CARD
  INVESTMENT
}

model Category {
  id           String        @id @default(cuid())
  userId       String
  name         String
  type         CategoryType
  icon         String        @default("tag")
  color        String        @default("#8b5cf6")
  isDefault    Boolean       @default(false)
  createdAt    DateTime      @default(now())
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgets      Budget[]

  @@unique([userId, name, type])
  @@index([userId])
}

enum CategoryType {
  INCOME
  EXPENSE
}

model Transaction {
  id          String          @id @default(cuid())
  userId      String
  accountId   String
  categoryId  String
  type        CategoryType
  amount      Decimal         @db.Decimal(12, 2)
  description String
  date        DateTime
  tags        String[]        @default([])
  notes       String?
  isRecurring Boolean         @default(false)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  account     Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category    Category        @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@index([userId, categoryId])
  @@index([userId, accountId])
}

model Budget {
  id         String       @id @default(cuid())
  userId     String
  categoryId String
  amount     Decimal      @db.Decimal(12, 2)
  month      Int
  year       Int
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  category   Category     @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId, month, year])
  @@index([userId, month, year])
}

model RecurringTransaction {
  id          String        @id @default(cuid())
  userId      String
  accountId   String
  categoryId  String
  type        CategoryType
  amount      Decimal       @db.Decimal(12, 2)
  description String
  frequency   Frequency
  nextRunDate DateTime
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([nextRunDate])
}

enum Frequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

model Goal {
  id            String   @id @default(cuid())
  userId        String
  name          String
  targetAmount  Decimal  @db.Decimal(12, 2)
  currentAmount Decimal  @default(0) @db.Decimal(12, 2)
  deadline      DateTime
  color         String   @default("#10b981")
  icon          String   @default("target")
  isCompleted   Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  title     String
  message   String
  type      NotificationType
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}

enum NotificationType {
  BUDGET_ALERT
  GOAL_REACHED
  RECURRING_CREATED
  INSIGHT
  SYSTEM
}
```

---

## Phase 3: Authentication (NextAuth v5 + JWT)

### [NEW] `src/lib/auth.ts`
- NextAuth config with Credentials provider
- JWT strategy, bcrypt password verification
- Custom `jwt` and `session` callbacks to attach `userId`

### [NEW] `src/app/api/auth/[...nextauth]/route.ts`
- Export GET/POST handlers from auth config

### [NEW] `middleware.ts`
- Protect all `/dashboard/*` routes
- Redirect unauthenticated users to `/login`

### [NEW] `src/actions/auth.actions.ts`
- `registerUser` — hash password, create user + default categories + default account
- `loginUser` — server action wrapping `signIn("credentials")`

### [NEW] `src/app/(auth)/login/page.tsx` & `register/page.tsx`
- Beautiful auth forms with React Hook Form + Zod
- Glassmorphism card design, animated backgrounds

---

## Phase 4: Core UI Framework

### [NEW] `src/components/ui/`
Reusable primitives:
- `Button.tsx` — variants (primary, secondary, ghost, danger), sizes, loading state
- `Input.tsx` — with label, error state, icons
- `Select.tsx` — styled select dropdown
- `Card.tsx` — glassmorphism card with hover effects
- `Modal.tsx` — animated modal with overlay
- `Badge.tsx` — colored badges for tags/status
- `Skeleton.tsx` — loading skeletons
- `EmptyState.tsx` — illustrated empty states
- `ProgressBar.tsx` — animated progress bar
- `Toast.tsx` — notification toasts
- `DatePicker.tsx` — date input component
- `Avatar.tsx` — user avatar

### [NEW] `src/components/layout/`
- `Sidebar.tsx` — collapsible sidebar with nav links, icons, active states
- `Topbar.tsx` — search bar, notifications bell, user menu, theme toggle
- `ThemeToggle.tsx` — dark/light mode switcher (next-themes)
- `MobileNav.tsx` — bottom navigation for mobile

### [NEW] `src/components/providers/`
- `Providers.tsx` — wraps SessionProvider, ThemeProvider
- `ToastProvider.tsx` — toast notification context

---

## Phase 5: Dashboard

### [NEW] `src/app/(dashboard)/dashboard/page.tsx`
- Server component fetching summary data
- Monthly income/expense/balance summary cards with sparklines
- Recent transactions list
- Budget progress indicators
- Savings goals progress

### [NEW] `src/components/dashboard/`
- `SummaryCards.tsx` — income, expense, net balance cards with animated counters
- `IncomeExpenseChart.tsx` — Recharts line/bar chart (monthly trends)
- `CategoryPieChart.tsx` — expense breakdown pie chart
- `RecentTransactions.tsx` — latest 5-10 transactions
- `BudgetOverview.tsx` — top budgets with progress bars
- `GoalProgress.tsx` — savings goals mini cards

### [NEW] `src/services/dashboard.service.ts`
- `getMonthlySummary(userId, month, year)`
- `getMonthlyTrend(userId, months)`
- `getCategoryBreakdown(userId, month, year)`

---

## Phase 6: Transactions (Full CRUD)

### [NEW] `src/app/(dashboard)/transactions/page.tsx`
- Server component with filters (date range, category, account, search)
- Paginated transaction list
- Add transaction modal

### [NEW] `src/components/transactions/`
- `TransactionForm.tsx` — React Hook Form + Zod, supports add/edit
- `TransactionList.tsx` — sortable list with edit/delete
- `TransactionFilters.tsx` — date range, category, account, search, tags
- `TransactionItem.tsx` — individual row with category icon, amount, date

### [NEW] `src/services/transaction.service.ts`
- `getTransactions(userId, filters, pagination)`
- `createTransaction(data)` — also updates account balance
- `updateTransaction(id, data)` — adjusts account balance diff
- `deleteTransaction(id)` — reverses account balance

### [NEW] `src/actions/transaction.actions.ts`
- Server actions wrapping service layer with auth checks

### [NEW] `src/lib/validations/transaction.ts`
- Zod schemas for create/update/filter

---

## Phase 7: Accounts Management

### [NEW] `src/app/(dashboard)/accounts/page.tsx`
- Account cards with balances, types, recent activity

### [NEW] `src/components/accounts/`
- `AccountCard.tsx` — colored card with balance, type icon
- `AccountForm.tsx` — add/edit account modal
- `AccountList.tsx` — grid of account cards

### [NEW] `src/services/account.service.ts`
- CRUD operations + balance recalculation

---

## Phase 8: Budgeting

### [NEW] `src/app/(dashboard)/budgets/page.tsx`
- Monthly budget overview with category-wise budgets
- Budget vs actual comparison

### [NEW] `src/components/budgets/`
- `BudgetCard.tsx` — category, limit, spent, progress bar with color coding
- `BudgetForm.tsx` — set budget per category per month
- `BudgetChart.tsx` — Recharts bar chart (budget vs actual)

### [NEW] `src/services/budget.service.ts`
- `getBudgets(userId, month, year)` with actual spending calculated
- `createOrUpdateBudget(data)`
- Budget alert logic (> 80% spent → warning, > 100% → danger)

---

## Phase 9: Savings Goals

### [NEW] `src/app/(dashboard)/goals/page.tsx`
- Goal cards with progress, deadline countdown

### [NEW] `src/components/goals/`
- `GoalCard.tsx` — circular progress, target vs current, days remaining
- `GoalForm.tsx` — create/edit goal
- `ContributeModal.tsx` — add funds to goal

### [NEW] `src/services/goal.service.ts`
- CRUD + contribute logic

---

## Phase 10: Recurring Transactions

### [NEW] `src/app/(dashboard)/recurring/page.tsx`
- List of active/inactive recurring transactions

### [NEW] `src/components/recurring/`
- `RecurringList.tsx`
- `RecurringForm.tsx`

### [NEW] `src/services/recurring.service.ts`
- CRUD + processing logic
- `processRecurringTransactions()` — creates due transactions, advances next run date

### [NEW] `src/app/api/cron/recurring/route.ts`
- API route for cron job (Vercel Cron or external)
- Processes all due recurring transactions

---

## Phase 11: Reports & Export

### [NEW] `src/app/(dashboard)/reports/page.tsx`
- Monthly/yearly report views
- Income vs expense trends
- Category breakdown
- Export to CSV button

### [NEW] `src/components/reports/`
- `MonthlyReport.tsx` — detailed monthly breakdown
- `YearlyReport.tsx` — year-over-year comparison
- `ExportButton.tsx` — CSV export

### [NEW] `src/services/report.service.ts`
- `getMonthlyReport(userId, month, year)`
- `getYearlyReport(userId, year)`
- `exportToCSV(transactions)` — generates CSV string

---

## Phase 12: Advanced Features

### AI Spending Insights
- `src/services/insight.service.ts` — rule-based analysis:
  - Spending trends (increasing/decreasing categories)
  - Unusual transactions (> 2x average)
  - Budget optimization suggestions
  - Savings rate analysis
- Dashboard widget showing top 3 insights

### Multi-Currency
- Currency field on User and Account models
- `src/lib/utils.ts` — `formatCurrency(amount, currency)` helper
- Display amounts in respective currencies

### Notification System
- `src/services/notification.service.ts`
  - Budget exceeded alerts
  - Goal milestone notifications
  - Recurring transaction creation confirmations
- Notification bell in topbar with dropdown
- Mark as read functionality

### Settings Page
- `src/app/(dashboard)/settings/page.tsx`
  - Profile update (name, email)
  - Default currency selection
  - Category management (add custom categories)
  - Password change

---

## UI/UX Design Decisions

| Feature | Implementation |
|---|---|
| **Color Palette** | Indigo/violet primary, emerald for income, rose for expense, slate for neutrals |
| **Dark Mode** | `next-themes` with CSS variables, smooth transition |
| **Typography** | Inter font from Google Fonts |
| **Cards** | Glassmorphism with `backdrop-blur`, subtle borders |
| **Animations** | CSS transitions on hover, Tailwind `animate-*` for loading |
| **Charts** | Recharts with custom colors matching theme, lazy loaded |
| **Responsive** | Mobile-first, collapsible sidebar, bottom nav on mobile |
| **Empty States** | Illustrated with action buttons |
| **Loading** | Skeleton components matching content shape |

---

## Environment Variables

```env
# Neon PostgreSQL
DATABASE_URL="postgresql://user:pass@endpoint-pooler.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:pass@endpoint.region.aws.neon.tech/dbname?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Verification Plan

### Automated Tests
- `npx prisma validate` — schema validation
- `npx prisma generate` — client generation
- `npm run build` — full production build to catch TypeScript errors
- Browser testing — navigate through all pages, test auth flow, create transactions

### Manual Verification
- Visual inspection of all pages in light/dark mode
- Mobile responsiveness check
- Full auth flow (register → login → protected routes)
- CRUD operations on all entities
- Chart rendering with sample data
- CSV export functionality

---

## Open Questions

> [!IMPORTANT]
> 1. **Do you have a Neon database ready?** If not, we'll set up everything with placeholder connection strings and you can swap them when ready.
> 2. **Any preference on the color scheme?** Default plan uses indigo/violet primary palette.
> 3. **Should I seed the database with sample data** for demo purposes (sample categories, transactions, etc.)?
> 4. **Any specific currencies** you want pre-configured beyond USD?
