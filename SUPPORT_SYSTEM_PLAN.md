# User Support System Implementation Plan

This document outlines a support system for takapilot where users can create support tickets, chat with admins, and optionally grant temporary read-only support access with a PIN. The PIN flow must be treated as a sensitive authorization feature, not a normal impersonation shortcut.

## Goals

- Give users a clear place to request help and track ticket history.
- Give admins a dedicated support queue with ticket filters, status updates, and replies.
- Let a user grant temporary support access by sharing a short PIN with an admin.
- Keep support access auditable, time-limited, revocable, and read-only by default.
- Avoid giving admins silent write access to user financial data through the normal workspace-switching flow.

## Non-Goals For The First Version

- No external helpdesk integration.
- No email/SMS automation unless added in a later notification phase.
- No full account impersonation.
- No admin edits to user accounts, transactions, goals, budgets, investments, or notes from support-view mode.

## 1. Database Schema Changes

Add support-ticket models, support access sessions, and audit records in `prisma/schema.prisma`.

```prisma
enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum SupportTicketPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum SupportTicketCategory {
  GENERAL
  BILLING
  BUG_REPORT
  FEATURE_REQUEST
  ACCOUNT_ISSUE
}

enum SupportAccessAuditAction {
  PIN_GENERATED
  PIN_REVOKED
  PIN_VERIFIED
  PIN_FAILED
  SUPPORT_VIEW_STARTED
  SUPPORT_VIEW_ENDED
  SUPPORT_VIEW_EXPIRED
}

model SupportTicket {
  id          String                @id @default(cuid())
  userId      String
  subject     String
  description String                @db.Text
  phoneNumber String?
  status      SupportTicketStatus   @default(OPEN)
  priority    SupportTicketPriority @default(NORMAL)
  category    SupportTicketCategory @default(GENERAL)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  resolvedAt  DateTime?

  user        User                  @relation("UserSupportTickets", fields: [userId], references: [id], onDelete: Cascade)
  messages    SupportMessage[]
  accessSessions SupportAccessSession[]
  auditLogs   SupportAccessAudit[]

  @@index([userId])
  @@index([status])
  @@index([priority])
  @@index([category])
  @@index([updatedAt])
}

model SupportMessage {
  id          String        @id @default(cuid())
  ticketId    String
  senderId    String
  message     String        @db.Text
  isFromAdmin Boolean       @default(false)
  createdAt   DateTime      @default(now())

  ticket      SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  sender      User          @relation("UserSupportMessages", fields: [senderId], references: [id], onDelete: Cascade)

  @@index([ticketId, createdAt])
  @@index([senderId])
}

model SupportAccessSession {
  id              String    @id @default(cuid())
  userId          String
  adminId         String?
  ticketId        String?
  pinHash         String
  pinExpiresAt    DateTime
  verifiedAt      DateTime?
  revokedAt       DateTime?
  failedAttempts  Int       @default(0)
  lastFailedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User      @relation("UserSupportAccessSessions", fields: [userId], references: [id], onDelete: Cascade)
  admin           User?     @relation("AdminSupportAccessSessions", fields: [adminId], references: [id], onDelete: SetNull)
  ticket          SupportTicket? @relation(fields: [ticketId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([adminId])
  @@index([ticketId])
  @@index([pinExpiresAt])
}

model SupportAccessAudit {
  id          String                   @id @default(cuid())
  userId      String
  adminId     String?
  ticketId    String?
  action      SupportAccessAuditAction
  metadata    Json?
  createdAt   DateTime                 @default(now())

  user        User                     @relation("UserSupportAccessAudits", fields: [userId], references: [id], onDelete: Cascade)
  admin       User?                    @relation("AdminSupportAccessAudits", fields: [adminId], references: [id], onDelete: SetNull)
  ticket      SupportTicket?           @relation(fields: [ticketId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([adminId, createdAt])
  @@index([ticketId])
}
```

Update `User` with named relations:

```prisma
supportTickets       SupportTicket[]       @relation("UserSupportTickets")
supportMessages      SupportMessage[]      @relation("UserSupportMessages")
supportAccessSessions SupportAccessSession[] @relation("UserSupportAccessSessions")
adminSupportAccessSessions SupportAccessSession[] @relation("AdminSupportAccessSessions")
supportAccessAudits  SupportAccessAudit[]  @relation("UserSupportAccessAudits")
adminSupportAccessAudits SupportAccessAudit[] @relation("AdminSupportAccessAudits")
```

Do not store `supportPin` directly on `User`. A support PIN is a temporary grant, so it belongs in `SupportAccessSession` with a hash, expiry, and audit trail.

## 2. Support PIN And Access Architecture

### User Flow

- User opens `/support`.
- User creates a ticket, or selects an existing open ticket.
- User clicks `Generate Support PIN`.
- System creates a random 6-digit PIN, stores only a hash, and shows the PIN once.
- PIN expires quickly, recommended default: 30 minutes.
- User can revoke the active PIN at any time.

### Admin Flow

- Admin opens `/admin/support`.
- Admin enters the user-provided PIN, preferably from a ticket context.
- System verifies the hash, expiry, revoked state, and failed-attempt count.
- System records the admin id and verification time on the support access session.
- Admin can enter a dedicated support-view mode for that user.

### Support View Rules

- Support view is read-only.
- Support view must not reuse unrestricted admin access.
- Support view should use a separate cookie, for example `pft_support_view`, instead of only using `pft_active_workspace`.
- `getEffectiveUserId()` may resolve to the target user while support view is active, but `validateAccess(feature, 'EDIT')` must reject all edits when support view is active.
- Show a persistent banner while support view is active: `Viewing user data for support`.
- Provide a clear `Exit support view` action that clears the support-view cookie.

### Security Requirements

- Store PINs with a one-way hash.
- Use a cryptographically secure random generator.
- Do not log the raw PIN.
- Show the raw PIN only once immediately after generation.
- Expire PINs automatically.
- Revoke older active PINs for the same user when a new one is generated.
- Lock a support access session after too many failed attempts, for example 5.
- Rate-limit verification attempts per admin and per PIN/session.
- Audit generation, revocation, failed verification, successful verification, view start, view end, and expiry.

## 3. Backend Services And Actions

### Service Layer: `src/services/support.service.ts`

- `createTicket(userId, data)`: create ticket and initial message in one transaction.
- `getUserTickets(userId)`: list tickets owned by the current user.
- `getTicketDetails(ticketId, requester)`: allow owner or admin.
- `addMessageToTicket(ticketId, senderId, message)`: append user/admin reply.
- `updateTicketStatus(ticketId, status)`: admin only.
- `getAllTickets(filters)`: admin queue with status, priority, category, and search.
- `generateSupportPin(userId, ticketId?)`: create hashed PIN session and return raw PIN once.
- `revokeSupportPin(userId, sessionId)`: revoke active support PIN.
- `verifySupportPin(adminId, pin, ticketId?)`: admin-only verification with rate limiting and audit.
- `startSupportView(adminId, supportAccessSessionId)`: create support-view cookie/session.
- `endSupportView(adminId)`: clear support-view state and audit exit.
- `getActiveSupportView(adminId)`: return active target user and expiry for banners/server guards.

### Server Actions: `src/actions/support.actions.ts`

- User actions should require a signed-in active user and subscription access where appropriate.
- Admin queue and status actions should use `requireRole('ADMIN')`.
- Ticket ownership must be checked on every user-facing ticket action.
- Admin support-view actions must validate the support access session, not only the admin role.

Important: `validateAccess('SUPPORT', ...)` should only be used after adding `SUPPORT` to the Prisma `Feature` enum. If support is not part of shared-workspace permissions, use direct ownership/admin checks instead.

## 4. Access Guard Integration

Current app behavior already uses `getEffectiveUserId()` and `validateAccess()` for owner-scoped financial data. The support system should extend that path carefully.

Recommended changes:

- Add a support-view helper in `src/lib/support-access.ts`.
- Read a separate signed support-view cookie.
- Validate that the support access session is verified, not expired, not revoked, and belongs to the logged-in admin.
- Allow read paths to resolve the effective user id to the target user while support view is active.
- Block edit paths when support view is active, even if the viewer is an admin.
- Keep normal admin pages available to admins outside support-view mode.

This avoids accidentally turning the PIN into a full impersonation feature.

## 5. User Interface

### User Support Portal: `src/app/(dashboard)/support`

- Ticket list/table with subject, category, priority, status, last update, and created date.
- Header actions: `New ticket`, `Generate support PIN`.
- Support PIN panel or modal:
  - shows active expiry if one exists,
  - shows the raw PIN only immediately after generation,
  - includes copy button,
  - includes revoke button,
  - explains that access is read-only and temporary.
- Create ticket modal:
  - category,
  - priority,
  - subject,
  - description,
  - optional phone number.
- Ticket detail route `/support/[id]`:
  - conversation history,
  - reply box,
  - ticket status badge,
  - PIN generation tied to that ticket when useful.

## 6. Admin Interface

### Admin Support Queue: `src/app/(dashboard)/admin/support`

- Global ticket table with filters for status, priority, category, and search.
- Columns:
  - user,
  - subject,
  - status,
  - priority,
  - category,
  - created date,
  - last update.
- Header action: `Enter support PIN`.
- PIN modal:
  - PIN input,
  - optional ticket selector/context,
  - verification result,
  - `Start support view` button.

### Admin Ticket Detail: `src/app/(dashboard)/admin/support/[id]`

- Ticket conversation with admin replies visually distinguished.
- Status management controls.
- User summary panel.
- `Start support view` button only after a valid PIN session exists for that user.
- Support audit timeline for the ticket.

### Navigation

- Add `Support` to the user sidebar.
- Add `Support` to the admin sidebar and mobile admin menu.
- Add route loading UI under the support route segments if the page fetches server data.

## 7. Validation And UX Rules

- Use Zod schemas for ticket creation, replies, status updates, and PIN verification.
- Keep ticket subject short enough for tables.
- Limit message length.
- Normalize phone number as optional text; do not block ticket creation if missing.
- Prevent users from editing ticket status directly.
- Allow users to reply only to their own tickets.
- Allow admins to reply to any ticket.
- Lock replies on `CLOSED` tickets unless an admin reopens them.
- Use modal-based create flows where the page would otherwise become crowded.

## 8. Notifications

Initial version can revalidate UI only. Later notification integration can add:

- Notify admins when a new ticket is created.
- Notify users when an admin replies.
- Notify users when an admin starts support view.
- Notify users when support access expires or is revoked.

## 9. Implementation Phases

### Phase 1: Database And Backend Foundation

- Add Prisma enums and models.
- Add migration.
- Generate Prisma client.
- Add support service and action files.
- Add validation schemas.
- Add audit helpers.

### Phase 2: Support PIN And Read-Only Access Guard

- Add hashed PIN generation and revocation.
- Add admin PIN verification with attempt limits.
- Add support-view cookie/session helper.
- Update effective-user/access helpers to permit read-only support view and reject edits.
- Add support-view banner and exit action.

### Phase 3: User Support UI

- Build `/support` ticket list.
- Build ticket creation modal.
- Build PIN modal/panel.
- Build `/support/[id]` conversation page.

### Phase 4: Admin Support UI

- Add admin support navigation.
- Build `/admin/support` queue and filters.
- Build PIN verification modal.
- Build `/admin/support/[id]` ticket detail and status controls.

### Phase 5: Notifications And Polish

- Add notification hooks for replies and support-view events.
- Add loading states.
- Add empty states.
- Add audit timeline UI.

## 10. Testing Checklist

- User can create a ticket.
- User can reply to their own ticket.
- User cannot view another user's ticket.
- Admin can view all tickets.
- Admin can reply and change status.
- User can generate a PIN and see it once.
- Raw PIN is not stored in the database.
- Expired PIN cannot be verified.
- Revoked PIN cannot be verified.
- Failed PIN attempts are limited and audited.
- Admin can start support view only after successful PIN verification.
- Support view can read the target user's dashboard data.
- Support view cannot create, edit, or delete target user data.
- Exiting support view returns admin to their own context.
- Audit records are written for PIN and support-view events.
