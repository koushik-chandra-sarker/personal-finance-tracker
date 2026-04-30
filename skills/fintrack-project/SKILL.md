---
name: fintrack-project
description: Project-specific guidance for working in the FinTrack personal finance tracker repository. Use when Codex needs to implement, debug, review, or explain features in this repo, especially Next.js App Router pages, React client components, Server Actions, Prisma services, access-control behavior, dashboard/reporting flows, budgets, transactions, accounts, categories, goals, recurring transactions, settings, or collaboration permissions.
---

# FinTrack Project

Use this skill to work inside the FinTrack repo without rediscovering its architecture and local constraints.

## First Checks

1. Read `AGENTS.md` before changing code.
2. Check `git status --short` before edits and preserve unrelated user changes.
3. For Next.js code, read the relevant guide under `node_modules/next/dist/docs/` first. This repo uses Next.js 16.2.1, and local instructions warn that APIs and conventions may differ from older Next.js knowledge.
4. Read `CODEX_MEMORY.md` for the latest project notes and known verification state.
5. Load `references/project-map.md` when the task touches architecture, data models, route structure, commands, or conventions.

## Implementation Workflow

Prefer the repo's existing boundaries:

- Server pages in `src/app` authenticate, fetch data through services, and pass JSON-safe props to client components.
- Client feature components in `src/components/*` own forms, modals, filters, transitions, optimistic UI, and `router.refresh()`.
- Server Actions in `src/actions` validate auth and access, parse `FormData` with Zod schemas from `src/lib/validations`, call `src/services/*`, then `revalidatePath`.
- Business logic and Prisma queries live in `src/services`.
- Shared auth, access, Prisma, and utility helpers live in `src/lib`.
- Shared app types live in `src/types/index.ts`.

When adding a feature, update the full vertical slice as needed: Prisma schema and migration, service, validation schema, server action, page data fetching, client UI, shared type, and dashboard/report surfaces.

## Access Control

Preserve the workspace collaboration model:

- Use `getEffectiveUserId()` for owner-scoped reads and writes.
- Require `validateAccess(feature, 'VIEW')` for feature reads that support shared workspaces.
- Require `validateAccess(feature, 'EDIT')` for mutations.
- Track collaborator auditing fields such as `createdById` and `updatedById` when the target model supports them.
- Keep feature names aligned with the Prisma `Feature` enum.

## UI Conventions

Use existing UI primitives from `src/components/ui` and layout components from `src/components/layout`. Keep dashboard screens dense, scan-friendly, and consistent with the current Tailwind design language. Use `lucide-react` icons when adding icon buttons or feature controls.

Avoid introducing a new component library or broad visual restyle unless the user asks for it.

## Verification

Run the narrowest useful checks after changes:

- `npx prisma validate` after Prisma schema changes.
- `npx prisma generate` after schema/type changes when generated client types are needed.
- `npm run lint` for TypeScript/React lint checks. Existing lint failures may be unrelated; report them clearly.
- `npm run build` for broad Next.js/Prisma verification when behavior or routing changes are significant.

If a check cannot be run because of sandboxing, dependencies, database access, or existing failures, state that explicitly and include the relevant output summary.
