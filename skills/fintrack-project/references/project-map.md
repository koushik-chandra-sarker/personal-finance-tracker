# FinTrack Project Map

## Stack

- App: FinTrack, a personal finance tracker.
- Runtime: Node.js 24.
- Framework: Next.js 16.2.1 App Router with React 19.2.4 and TypeScript.
- Styling: Tailwind CSS 4.
- Data: Prisma 6.19.2 with PostgreSQL.
- Auth: NextAuth v5 beta.
- Forms and validation: React Hook Form, Zod.
- Charts and icons: Recharts, lucide-react.

## Routes

- Auth: `/login`, `/register`, `/recovery-backdoor`.
- Dashboard area: `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/categories`, `/goals`, `/recurring`, `/reports`, `/settings`.
- API: `/api/auth/[...nextauth]`, `/api/cron/recurring`, `/api/seed`.
- Root `/` redirects authenticated users to `/dashboard` and unauthenticated users to `/login`.

## Important Files

- `src/app/page.tsx`: root redirect behavior.
- `src/app/(dashboard)/layout.tsx`: main authenticated shell with sidebar and topbar.
- `src/app/(dashboard)/*/page.tsx`: server pages for dashboard features.
- `src/components/*/*PageClient.tsx`: primary client experiences for each feature.
- `src/actions/*.actions.ts`: Server Actions.
- `src/services/*.service.ts`: Prisma business logic.
- `src/lib/access.ts`: workspace and collaboration permissions.
- `src/lib/auth.ts` and `src/lib/auth.config.ts`: NextAuth setup.
- `src/lib/prisma.ts`: Prisma singleton.
- `src/lib/validations/*.ts`: Zod schemas.
- `src/types/index.ts`: shared app types and NextAuth session augmentation.
- `prisma/schema.prisma`: data model.

## Data Model

Core Prisma models:

- `User`
- `Account`
- `Category`
- `Transaction`
- `Budget`
- `RecurringTransaction`
- `Goal`
- `GoalProgress`
- `Notification`

Collaboration models:

- `SharedAccess`
- `FeatureAccess`

Key enums:

- `Feature`
- `AccessLevel`
- `AccountType`
- `CategoryType`
- `Frequency`
- `GoalTransactionType`
- `NotificationType`

## Current Access Model

`src/lib/access.ts` owns workspace switching and permissions.

- `WORKSPACE_COOKIE` is `pft_active_workspace`.
- `getActiveWorkspace()` reads the selected owner workspace id from cookies.
- `getEffectiveUserId()` returns the selected owner workspace id or the current user id.
- `validateAccess(feature, level)` enforces feature-level `VIEW` or `EDIT`.
- Own workspace access is unrestricted.
- Shared workspace mutations should require `EDIT`.

## Feature Slice Pattern

For a normal feature change:

1. Update `prisma/schema.prisma` and add a migration if persistent data changes.
2. Update or add Zod schema in `src/lib/validations`.
3. Update `src/services` with Prisma reads/writes and Decimal-to-number conversion for UI data.
4. Update `src/actions` to enforce auth/access and return `ActionResponse` for mutations.
5. Update server page data fetching in `src/app/(dashboard)`.
6. Update client components in `src/components`.
7. Update shared types in `src/types/index.ts`.
8. Revalidate affected routes after mutations, commonly the feature route and `/dashboard`.

## Verification Commands

- `npx prisma validate`
- `npx prisma generate`
- `npm run lint`
- `npm run build`
- `npm run dev`

Known state from `CODEX_MEMORY.md`: Prisma validation and build have passed before; lint may fail because of existing strict-policy issues such as explicit `any`, React Compiler effect warnings, unescaped entities, and unused symbols.
