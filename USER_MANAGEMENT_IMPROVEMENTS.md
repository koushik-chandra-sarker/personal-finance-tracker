# User Management Improvements

This note captures recommended improvements for the current user management, admin, subscription, and collaborator-access flows.

## Priority 1: Secure Password Recovery

The current recovery backdoor allows password reset by email without authentication. This should be removed, disabled outside local development, or replaced with a safer flow.

Recommended options:

- Use signed, single-use password reset tokens with expiration.
- Restrict manual password reset to authenticated admins.
- Record every reset in an audit log.
- Add rate limiting to reset attempts.
- Hide or remove `/recovery-backdoor` in production.

## Priority 2: Add Admin Audit Logs

Admin actions should be traceable. Add an `AdminAuditLog` table for sensitive changes.

Suggested fields:

- `id`
- `actorUserId`
- `targetUserId`
- `action`
- `before`
- `after`
- `ipAddress`
- `userAgent`
- `createdAt`

Actions to log:

- Role changes
- Subscription grants
- Subscription revokes
- Password resets
- User suspension or reactivation
- Collaborator invitations
- Collaborator permission changes

## Priority 3: Improve Admin User List

The current admin user page is useful but basic. It should become an operational tool for finding and managing users.

Recommended improvements:

- Search by name or email.
- Paginate results instead of loading only the first 100 users.
- Filter by role, access status, subscription package, and subscription status.
- Sort by joined date, name, last login, and subscription expiry.
- Show last login date.
- Show account status.
- Link each row to a user detail page.

## Priority 4: Add User Account Status

Add an explicit status field to the `User` model so admins can disable access without deleting data.

Suggested enum:

```prisma
enum UserStatus {
  ACTIVE
  SUSPENDED
  INVITED
  DELETED
}
```

Suggested `User` fields:

```prisma
status          UserStatus @default(ACTIVE)
lastLoginAt     DateTime?
emailVerifiedAt DateTime?
lockedUntil     DateTime?
sessionVersion  Int        @default(1)
```

Use cases:

- Suspend a user without deleting financial records.
- Track inactive users.
- Require email verification before full access.
- Lock accounts after repeated failed login attempts.

## Priority 5: Add Invite-Based Onboarding

For an admin-managed subscription app, invites can provide better control than open registration.

Recommended flow:

1. Admin creates an invite for an email.
2. Admin assigns a role and optional subscription package.
3. User accepts the invite.
4. User sets their password.
5. Account is activated.

Suggested invite fields:

- `email`
- `role`
- `packageId`
- `tokenHash`
- `expiresAt`
- `acceptedAt`
- `invitedById`
- `createdAt`

## Priority 6: Invalidate Stale Sessions

Role and subscription changes are written to the database, but existing JWT sessions can remain stale until the user refreshes or signs in again.

Recommended approach:

- Add `sessionVersion` to `User`.
- Store `sessionVersion` in the JWT.
- Increment it when role, subscription, password, or account status changes.
- Reject or refresh sessions when the JWT version is older than the database version.

This makes admin changes take effect immediately.

## Priority 7: Strengthen Authentication Rules

Current password validation is minimal. Improve baseline auth controls.

Recommended improvements:

- Raise password minimum length to at least 8 characters.
- Add login rate limiting by IP and email.
- Add register rate limiting.
- Add password reset rate limiting.
- Add email verification.
- Track failed login attempts.
- Lock accounts temporarily after repeated failures.

## Priority 8: Split Admin Permissions

The current model has `ADMIN` and `USER`. As the admin area grows, a single admin role becomes too broad.

Possible roles:

- `OWNER`
- `ADMIN`
- `BILLING_ADMIN`
- `SUPPORT`
- `USER`

Alternative approach:

- Keep roles simple.
- Add a permission table for specific admin capabilities.

Examples:

- Billing admins can grant or revoke subscriptions.
- Support users can view user details but cannot promote admins.
- Owners can manage all admin roles.

## Priority 9: Add User Detail Page

Add a dedicated admin route for each user.

Suggested route:

```text
/admin/users/[userId]
```

Suggested sections:

- Profile summary
- Role and account status
- Subscription history
- Collaborator access
- Recent activity
- Audit log
- Password reset action
- Suspend or reactivate action

## Priority 10: Improve Collaborator Management

The app already supports feature-level collaborator permissions. This can be made more robust and easier to manage.

Recommended improvements:

- Add pending invitations instead of requiring the collaborator to already exist.
- Add invite expiration.
- Add permission presets such as `Viewer`, `Editor`, and `Manager`.
- Add accepted date and revoked date.
- Audit permission changes.
- Show who granted or changed access.

## Suggested Implementation Order

1. Remove or secure the recovery backdoor.
2. Add admin audit logs.
3. Add user status fields.
4. Add search, filters, and pagination to `/admin/users`.
5. Add user detail page.
6. Add invite-based onboarding.
7. Add session invalidation with `sessionVersion`.
8. Split admin roles or add admin permissions.
9. Improve collaborator invitations and presets.

