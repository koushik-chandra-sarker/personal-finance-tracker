# Codex Memory

## Project
- Repo: `/media/koushik/Personal/Woe/pft`
- App: personal finance tracker named FinTrack.
- Stack: Next.js 16.2.1 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Prisma 6.19.2, PostgreSQL, NextAuth v5 beta, React Hook Form, Zod, Recharts, lucide-react.
- Node.js version: 24.
- Important instruction: this repo uses a newer Next.js version with breaking changes. Read relevant docs under `node_modules/next/dist/docs/` before writing Next.js code.

## Architecture
- Server pages live in `src/app` and usually authenticate with `auth()`, fetch data, then pass JSON-safe props into client components.
- Client feature components live under `src/components/*` and handle forms, modals, filters, transitions, and `router.refresh()`.
- Server Actions live in `src/actions`; they validate auth/access, parse `FormData` with Zod, call service functions, then `revalidatePath`.
- Prisma business logic lives in `src/services`.
- Shared helpers live in `src/lib`; common app types are in `src/types/index.ts`.
- UI work must be mobile-compatible by default. Check small-screen layouts for stacked controls, full-width touch targets, readable cards/lists, and no horizontal overflow.

## Routes
- Auth routes: `/login`, `/register`, `/recovery-backdoor`.
- Dashboard routes: `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/categories`, `/goals`, `/recurring`, `/reports`, `/settings`.
- API routes: `/api/auth/[...nextauth]`, `/api/cron/recurring`, `/api/seed`.
- Root `/` redirects authenticated users to `/dashboard`, others to `/login`.

## Data Model
- Core Prisma models: `User`, `Account`, `Category`, `Transaction`, `Budget`, `RecurringTransaction`, `Goal`, `GoalProgress`, `Notification`.
- Collaboration models: `SharedAccess`, `FeatureAccess`.
- Key enums: `Feature`, `AccessLevel`, `AccountType`, `CategoryType`, `Frequency`, `GoalTransactionType`, `NotificationType`.

## Access Model
- `src/lib/access.ts` owns workspace switching and permissions.
- `WORKSPACE_COOKIE` stores active workspace id.
- `getEffectiveUserId()` returns the selected owner workspace id or current user id.
- `validateAccess(feature, level)` enforces feature-level `VIEW` or `EDIT`.
- Pages generally require `VIEW`; mutation actions require `EDIT`.

## Known Verification State
- `npx prisma validate` passed.
- `npm run build` passed.
- `npm run lint` currently fails.
- Lint failures are mostly existing strict-policy issues:
  - `@typescript-eslint/no-explicit-any`
  - React Compiler `react-hooks/set-state-in-effect`
  - `react/no-unescaped-entities`
  - several unused imports/vars warnings.

## Likely Next Work
- Budget rollover has been added: `Budget.rolloverEnabled`, migration `20260430120000_add_budget_rollover`, computed `rolloverAmount`/`effectiveAmount`/`projectedRolloverAmount` in `src/services/budget.service.ts`, UI controls in `BudgetPageClient`, dashboard display in `BudgetOverview`, and budget insights based on effective limits.
- If asked to continue implementation, start with lint cleanup or apply the new Prisma migration to the target database.
- Fast path: adjust ESLint severity for scaffold-level `any`, React Compiler advisory effect rule, and unescaped entity rule.
- Strict path: replace `any` with Prisma/Zod/session types and refactor synchronous effect-derived state patterns.
- Before edits, check `git status --short` and avoid overwriting user changes.
