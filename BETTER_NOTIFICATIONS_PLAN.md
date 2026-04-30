# Better Notifications Plan

## Goal

Turn notifications from a basic inbox into a useful financial alert system for bills, budget thresholds, goal deadlines, unusual expenses, and low balances.

The current app already has a `Notification` model, a small notification service, recurring transactions, budgets, goals, insights, accounts, and an existing recurring cron route. This feature should extend that foundation instead of creating a separate alert system.

## User Outcomes

- Users see timely alerts before bills are due.
- Users are warned before and after budgets cross key thresholds.
- Users are reminded when goal deadlines are approaching.
- Users are alerted when a transaction looks unusually large for its category or account.
- Users are warned when an account balance falls below a configured limit.
- Users can control which notifications are enabled and avoid repeated duplicate alerts.

## Scope

### MVP

- Add richer notification metadata and deduplication.
- Add notification preferences per user.
- Add alert detectors for:
  - upcoming recurring bills
  - budget usage thresholds
  - goal deadlines
  - unusual expense transactions
  - low account balances
- Add a cron endpoint that runs detectors.
- Enable the Topbar notification bell with unread count and recent notifications.
- Add notification settings in Settings.

### Later

- Email or push delivery.
- Per-account low-balance thresholds.
- Per-budget custom threshold percentages.
- Snooze notifications.
- Dismiss notification type for a specific entity.
- Weekly financial digest.
- Collaborator-specific delivery rules.

## Data Model

Extend `Notification` so alerts can be deduplicated, linked to source records, and shown with severity.

```prisma
model Notification {
  id          String               @id @default(cuid())
  userId      String
  title       String
  message     String
  type        NotificationType
  severity    NotificationSeverity @default(INFO)
  sourceType  NotificationSource?
  sourceId    String?
  dedupeKey   String?
  actionUrl   String?
  isRead      Boolean              @default(false)
  createdAt   DateTime             @default(now())
  user        User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, dedupeKey])
  @@index([userId, isRead])
  @@index([userId, type, createdAt])
}

model NotificationPreference {
  id                         String   @id @default(cuid())
  userId                     String   @unique
  billRemindersEnabled       Boolean  @default(true)
  billReminderDaysBefore     Int      @default(3)
  budgetAlertsEnabled        Boolean  @default(true)
  budgetWarningThreshold     Int      @default(80)
  budgetCriticalThreshold    Int      @default(100)
  goalDeadlineEnabled        Boolean  @default(true)
  goalReminderDaysBefore     Int      @default(14)
  unusualExpenseEnabled      Boolean  @default(true)
  unusualExpenseMultiplier   Decimal  @default(2.00) @db.Decimal(6, 2)
  unusualExpenseMinAmount    Decimal  @default(50.00) @db.Decimal(12, 2)
  lowBalanceEnabled          Boolean  @default(true)
  lowBalanceThreshold        Decimal  @default(100.00) @db.Decimal(12, 2)
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt
  user                       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum NotificationSeverity {
  INFO
  WARNING
  CRITICAL
  SUCCESS
}

enum NotificationSource {
  RECURRING_TRANSACTION
  BUDGET
  GOAL
  TRANSACTION
  ACCOUNT
  SYSTEM
}
```

Extend `NotificationType`:

```prisma
enum NotificationType {
  BILL_REMINDER
  BUDGET_ALERT
  GOAL_DEADLINE
  GOAL_REACHED
  UNUSUAL_EXPENSE
  LOW_BALANCE
  RECURRING_CREATED
  INSIGHT
  SYSTEM
}
```

Add `User.notificationPreference NotificationPreference?`.

## Deduplication Rules

Every detector should call a shared `createNotificationOnce` helper with a stable `dedupeKey`.

Examples:

- Bill reminder: `bill:{recurringTransactionId}:{yyyy-mm-dd}:{daysBefore}`
- Budget threshold: `budget:{budgetId}:{year}-{month}:{threshold}`
- Goal deadline: `goal:{goalId}:{deadline}:{daysBefore}`
- Unusual expense: `unusual-expense:{transactionId}`
- Low balance: `low-balance:{accountId}:{threshold}:{yyyy-mm-dd}`

This avoids notification spam when cron runs repeatedly.

## Service Layer

Update `src/services/notification.service.ts`.

Add:

- `getNotifications(userId, limit?, unreadOnly?)`
- `getUnreadCount(userId)`
- `markAsRead(userId, id)`
  - Current implementation should include `userId` in the `where` check before updating.
- `markAllAsRead(userId)`
- `createNotification(userId, data)`
- `createNotificationOnce(userId, data)`
  - Uses `dedupeKey`.
  - Handles unique constraint conflicts gracefully.
- `getOrCreateNotificationPreferences(userId)`
- `updateNotificationPreferences(userId, data)`

Create `src/services/notification-detector.service.ts`.

Detectors:

- `detectUpcomingBills(userId, now)`
  - Reads active recurring expenses with `nextRunDate` within preference window.
  - Creates `BILL_REMINDER` notifications.
  - Action URL: `/recurring`.
- `detectBudgetThresholds(userId, now)`
  - Reuses `getBudgets(userId, month, year)`.
  - Creates warning at configured warning threshold and critical at configured critical threshold.
  - Action URL: `/budgets`.
- `detectGoalDeadlines(userId, now)`
  - Finds incomplete goals with deadline within preference window.
  - Creates `GOAL_DEADLINE` notifications.
  - Action URL: `/goals`.
- `detectUnusualExpenses(userId, transactionId?)`
  - Compares an expense transaction to recent history for the same category.
  - MVP heuristic: flag if amount is at least the configured minimum and at least `multiplier` times the average of the last 90 days for that category.
  - Action URL: `/transactions`.
- `detectLowBalances(userId, now)`
  - Finds active accounts with balance below configured threshold.
  - Creates one alert per account per day.
  - Action URL: `/accounts`.
- `runNotificationDetectors(userId?, now?)`
  - Runs all enabled detectors for one user or all users.
  - Returns counts by detector.

## Trigger Points

### Cron

Add `src/app/api/cron/notifications/route.ts`.

- Uses the same `CRON_SECRET` authorization pattern as `src/app/api/cron/recurring/route.ts`.
- Calls `runNotificationDetectors()`.
- Returns counts for created/skipped notifications.

### Transaction Creation

Update transaction creation flow to call unusual expense detection after an expense is created.

Reason:

- Unusual expenses are most useful immediately.
- Cron can still act as a backstop.

### Recurring Processing

After `processRecurringTransactions()` creates expense transactions, run unusual expense detection for the created transaction IDs or run the daily detector.

### Goal Contributions

When a contribution completes a goal, keep or improve the existing `GOAL_REACHED` notification behavior if present. If it is not currently wired, add it in goal service or action layer.

## Server Actions

Create or extend `src/actions/notification.actions.ts`.

Actions:

- `getNotificationsAction()`
  - Uses `getEffectiveUserId()`.
  - Requires access to the active workspace. Since notifications are user-owned today, decide whether workspace notifications belong to owner or current user before implementation.
- `getUnreadNotificationCountAction()`
- `markNotificationReadAction(id)`
- `markAllNotificationsReadAction()`
- `getNotificationPreferencesAction()`
- `updateNotificationPreferencesAction(formData)`

Access decision:

- Settings updates should require own workspace or `SETTINGS` `EDIT`.
- Reading workspace financial notifications should probably follow the relevant feature access only in a later iteration. MVP can scope notification preferences and inbox to the signed-in user.

## UI Plan

### Topbar Notification Bell

Update `src/components/layout/Topbar.tsx`.

Add:

- Bell button with unread count badge.
- Popover with latest notifications.
- Severity icon/color.
- Empty state.
- "Mark all read" action.
- Link to action URL when present.

The file already has a commented notification button, so this is the natural integration point.

### Settings Page

Add `NotificationSettings` component under `src/components/settings/`.

Controls:

- Enable bill reminders.
- Days before bill due date.
- Enable budget alerts.
- Warning threshold percentage.
- Critical threshold percentage.
- Enable goal deadline reminders.
- Days before goal deadline.
- Enable unusual expense alerts.
- Unusual expense multiplier.
- Minimum unusual expense amount.
- Enable low balance alerts.
- Low balance threshold.

Use existing `Card`, `Input`, `Button`, and form patterns.

### Notifications Page

Optional MVP:

- Add `/notifications` for a full inbox if the Topbar popover becomes cramped.

If skipped, keep the Topbar popover to the latest 10 to 20 notifications.

## Notification Copy

Use short, specific titles and messages.

Examples:

- Bill reminder:
  - Title: `Rent due soon`
  - Message: `$1,200.00 is scheduled for May 3.`
- Budget warning:
  - Title: `Groceries budget at 82%`
  - Message: `$410.00 of $500.00 used this month.`
- Goal deadline:
  - Title: `Emergency Fund deadline approaching`
  - Message: `14 days left and $750.00 still needed.`
- Unusual expense:
  - Title: `Unusual Dining expense`
  - Message: `$96.00 is higher than your recent Dining average.`
- Low balance:
  - Title: `Checking balance is low`
  - Message: `Current balance is $72.40, below your $100.00 threshold.`

## Implementation Order

1. Read the local Next.js docs in `node_modules/next/dist/docs/` before code changes, per `AGENTS.md`.
2. Add Prisma schema changes and migration.
3. Update `notification.service.ts` with metadata, preferences, and deduplication helpers.
4. Add `notification-detector.service.ts`.
5. Add cron route for notification detectors.
6. Add notification server actions.
7. Wire unusual expense detection into transaction creation.
8. Wire goal completion notification if missing.
9. Build Topbar notification bell and popover.
10. Build Settings notification preferences UI.
11. Add tests or manual verification for each detector.
12. Run lint/typecheck and verify cron endpoint behavior.

## Testing Plan

### Service Tests

- `createNotificationOnce` does not duplicate matching dedupe keys.
- Bill reminders create alerts only inside the configured window.
- Budget alerts create warning and critical notifications once per budget/month/threshold.
- Goal deadline alerts ignore completed goals.
- Unusual expense alerts ignore small transactions below minimum.
- Low balance alerts create at most one notification per account/day.
- Preferences disable their related detectors.

### Manual QA

- Create a recurring expense due within the reminder window and run notification cron.
- Create a budget and transactions that cross 80% and 100%.
- Create an incomplete goal due soon.
- Add an unusually large expense in an existing category.
- Lower an account balance below the threshold.
- Confirm Topbar unread count updates.
- Mark one notification read.
- Mark all notifications read.
- Disable each preference and confirm its detector stops creating alerts.

## Open Questions

- Should notifications in shared workspaces be created for the workspace owner only, every collaborator, or only the actor?
- Should low-balance thresholds be global in MVP or per account from the start?
- Should budget thresholds be global in MVP or configurable per budget?
- Should unusual expense detection compare by category, account, merchant-like description, or all three?
- Should reminders be delivered only in-app for now, or should email be included in the first release?
