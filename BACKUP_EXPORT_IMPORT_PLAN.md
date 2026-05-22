# TakaPilot Full JSON Backup Export/Import Plan

## Goal

Add a user-controlled JSON backup feature so a user can export their TakaPilot workspace data and later import it into the same or a new account. The feature should be safe enough for real personal finance data: predictable, validated, reversible where possible, and clear about what is included.

## Product Rules

- Users can export their own backup from Settings.
- Users can import into their own account only.
- Admin can optionally export/import for a selected user in a later phase, but the first release should stay user-scoped.
- Import must not overwrite auth, password, subscription/payment audit, admin audit, or support-access security records.
- Import should support two restore modes:
  - `Replace workspace`: clear current workspace data, then import backup.
  - `Merge`: import records without deleting current workspace data, resolving duplicates safely.
- Import must have a dry-run validation step before writing anything.
- Backup JSON must be versioned so future schema changes can be handled.

## Data Scope

### Include In User Backup

- User preferences:
  - `currency`
  - `preferredLocale`
  - notification preference settings
- Workspace finance data:
  - accounts
  - categories
  - transactions
  - budgets
  - goals
  - goal transactions/history
  - recurring transactions
  - personal subscription tracker data
  - financial notes
- Investment data:
  - investments
  - investment cashflows
  - user-created investment type/config rows, if any are user-scoped
- Salary/tax planning data:
  - salary scenarios
  - salary planner saved payloads

### Exclude From User Backup

- Password hashes and auth secrets.
- Manual payment requests and subscription billing records.
- Admin-created package/payment-method config.
- Admin messages and message states.
- Browser push subscriptions.
- Support access sessions, support access audits, and temporary support PINs.
- Global tax config seeded by admin.
- Page analytics, user activity analytics, and event logs.
- Account deletion records.

### Open Decision

Support tickets can be treated either way:

- Recommended first release: exclude support tickets because they are operational/admin records.
- Later option: export support tickets read-only for personal archive, but do not import them.

## Backup JSON Shape

Use one top-level envelope:

```json
{
  "format": "takapilot.backup",
  "version": 1,
  "exportedAt": "2026-05-22T00:00:00.000Z",
  "app": {
    "name": "takapilot",
    "schemaVersion": "2026-05-22"
  },
  "owner": {
    "name": "User Name",
    "email": "user@example.com",
    "currency": "BDT",
    "preferredLocale": "bn-BD"
  },
  "data": {
    "accounts": [],
    "categories": [],
    "transactions": [],
    "budgets": [],
    "goals": [],
    "recurringTransactions": [],
    "personalSubscriptions": [],
    "financialNotes": [],
    "investments": [],
    "investmentCashflows": [],
    "salaryScenarios": [],
    "notificationPreference": null
  },
  "checksums": {
    "recordCount": 0
  }
}
```

Rules:

- Keep original IDs inside the backup for relationship mapping.
- On import, never trust IDs as database ownership proof.
- Store all dates as ISO strings.
- Store decimals as strings to avoid money precision loss.
- Add `version` migrations when the backup shape changes.

## Export Design

### Server

Create:

- `src/services/backup.service.ts`
- `src/actions/backup.actions.ts`

Export service responsibilities:

- Require an authenticated user.
- Resolve effective user only if support-view rules allow it; first release should use the real logged-in user.
- Query included tables in a stable dependency order.
- Serialize decimals, dates, enums, and nullable fields consistently.
- Produce a deterministic JSON object.
- Add record counts and a lightweight checksum.

### UI

Add to Settings -> Security & Privacy or a new Settings -> Data section:

- `Export JSON backup` button.
- Last-export helper text.
- Warning that payment/subscription/admin records are not included.

UX behavior:

- Clicking export shows a loading state.
- Browser downloads `takapilot-backup-YYYY-MM-DD.json`.
- Success/error feedback should use the existing SweetAlert2 pattern.

## Import Design

### Server

Import should run as a transaction.

Create steps:

1. Parse JSON.
2. Validate top-level format and version.
3. Validate each collection with Zod schemas.
4. Build an import preview:
   - record counts
   - backup owner email/name
   - exported date
   - unsupported sections
   - warnings
5. User confirms import mode.
6. If `Replace workspace`, reuse `clearUserWorkspaceData(tx, userId, { recreateStarterData: false })`.
7. Insert records in dependency order.
8. Map old IDs to new IDs for relationships.
9. Recompute dependent balances/summaries where needed.

### Dependency Order

Recommended import order:

1. user preferences and notification preference
2. accounts
3. categories
4. transactions
5. budgets
6. goals
7. goal transactions/history
8. recurring transactions
9. personal subscription tracker
10. financial notes
11. investments
12. investment cashflows
13. salary scenarios

### ID Mapping

Maintain maps like:

- `accountIdMap`
- `categoryIdMap`
- `transactionIdMap`
- `goalIdMap`
- `investmentIdMap`

Every imported child row must reference the newly created parent ID.

### Duplicate Handling

For `Merge` mode:

- Accounts: match by normalized name + type.
- Categories: match by normalized name + type.
- Transactions: create new rows unless a strong duplicate signature matches.
- Budgets: match by category + month + year.
- Goals/investments/notes: create new rows by default.

For `Replace workspace` mode:

- Clear workspace first.
- Import all backup records cleanly.
- This should be the recommended restore mode for full backup.

## Validation And Safety

### Required Checks

- File must be valid JSON.
- `format` must equal `takapilot.backup`.
- `version` must be supported.
- Record count must be under configured limits.
- Required parent rows must exist inside the backup before importing children.
- Amounts must be finite decimals.
- Dates must be valid ISO strings.
- Enums must match current Prisma enum values.

### Abuse Protection

- Maximum upload size, for example 10 MB first release.
- Reject unexpected top-level executable/script-like content.
- Never import ownership fields directly.
- Never import `userId` from backup; always use current session user.
- Use one database transaction for writes.

### Recovery

Before `Replace workspace`, offer:

- `Download current backup first`
- typed confirmation like `IMPORT`

This pairs with the current destructive-data UX pattern.

## UI Flow

### Export

1. User opens Settings.
2. User clicks `Export backup`.
3. SweetAlert explains included/excluded data.
4. User confirms.
5. JSON downloads.

### Import

1. User opens Settings.
2. User clicks `Import backup`.
3. User selects JSON file.
4. App uploads/parses for dry run.
5. Preview modal shows:
   - backup owner
   - exported date
   - counts by section
   - warnings
   - restore mode selector
6. User types `IMPORT`.
7. App imports and shows result.

## Implementation Phases

### Phase 1: Backup Envelope And Export

- Add backup serialization helpers.
- Add export action.
- Add Settings export UI.
- Include core workspace tables only:
  - accounts
  - categories
  - transactions
  - budgets
  - goals
  - recurring transactions
  - personal subscriptions
  - financial notes

### Phase 2: Import Dry Run

- Add Zod validation schemas.
- Add JSON upload client.
- Add dry-run server action.
- Show preview counts and warnings.
- No writes yet.

### Phase 3: Replace-Mode Import

- Reuse `clearUserWorkspaceData`.
- Add transactional import.
- Add ID mapping.
- Add typed confirmation.
- Verify account/category/transaction relationships.

### Phase 4: Extended Data Coverage

- Add investments and investment cashflows.
- Add salary scenarios.
- Add notification preferences.
- Add goal history if it is separate from the core goal model.

### Phase 5: Merge Mode

- Add duplicate detection.
- Add conflict summary.
- Add merge import.
- Keep replace mode as recommended.

### Phase 6: Admin Tools

- Admin can export a selected user's backup.
- Admin can import for a selected user only with explicit confirmation.
- Add audit log entry for admin backup/import actions.

## Testing Plan

- Unit-test serializer/deserializer helpers.
- Unit-test decimal/date round trips.
- Unit-test ID mapping.
- Integration-test replace import into an empty user.
- Integration-test replace import over a user with existing data.
- Integration-test merge duplicate categories/accounts.
- Manual test with a rich seeded user.
- Manual test with Bangla locale and BDT amounts.
- Manual test with invalid/corrupted JSON.

## Acceptance Criteria

- User can download a valid JSON backup.
- Backup can be imported into a blank workspace.
- Replace import preserves relationships correctly.
- Import cannot affect another user's data.
- Import cannot alter password/subscription/payment/admin records.
- Invalid backup files fail with clear messages.
- Large or unsupported files are rejected safely.
- UI clearly explains what is included and excluded.

## Recommended First Implementation

Start with Phase 1 through Phase 3 only:

- Export core workspace data.
- Validate import with preview.
- Support replace-mode restore.

This gives users a real backup/restore path quickly without adding merge complexity too early.
