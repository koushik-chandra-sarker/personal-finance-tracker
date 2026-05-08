# Admin Analytics Features

This document lists the analytics features that should be available for FinTrack admins. The goal is to make `/admin/analytics` useful for business monitoring, user support, subscription operations, and product decisions.

## Current Analytics

The current admin analytics page can show data that already exists in the app:

- Total users
- Active users
- Admin users
- Suspended users
- Active, trialing, past-due, and canceled subscriptions
- Admin-granted vs self-service subscriptions
- Users without access
- New users by month
- New subscriptions by month
- Transaction activity by month
- Package-wise subscription mix
- Estimated monthly recurring value
- Estimated annual recurring value
- App-wide income, expense, account balance, and investment value
- Recent signups

Revenue should stay labeled as **estimated value** until a real payment provider is integrated.

## Site Visit Analytics

Site visit analytics should track how people move through the app, including anonymous and logged-in traffic.

Status: implemented with `PageView`, `/api/analytics/page-view`, `PageViewTracker`, and `/admin/analytics` visit dashboards.

Useful metrics:

- Total visits
- Unique visitors
- Page views by route
- Most visited pages
- Visits today, this week, and this month
- Anonymous visits vs logged-in visits
- Referrer/source
- Browser and device type
- First visit and last visit
- Entry route
- Exit route, if tracked from the client

Suggested data model:

```txt
PageView
id
userId optional
visitorId
sessionId
path
referrer
userAgent
deviceType
browser
ipHash
createdAt
```

Tracking options:

- Middleware can track route requests with low UI impact.
- A small client analytics component can track client-side route changes more accurately.
- Use a hashed IP instead of raw IP for privacy.
- Avoid storing sensitive query parameters.

## Live Activity / Online Users

Currently logged-in users are not the same as currently active users. A JWT/session can remain valid even when the user is not using the app. Admin analytics should show **active now** based on heartbeat data.

Status: implemented with `UserActivity`, `/api/analytics/activity`, `UserActivityTracker`, and Live Activity panels in `/admin/analytics`.

Useful metrics:

- Online users now
- Active users in the last 5 minutes
- Active users today
- Active users this week
- Current route per active user
- Last seen time
- Active sessions count
- Recent active users list

Suggested data model:

```txt
UserActivity
id
userId
sessionId
currentPath
lastSeenAt
userAgent
createdAt
updatedAt
```

Online rule:

```txt
onlineNow = lastSeenAt >= now - 5 minutes
```

Tracking approach:

- Add a small authenticated client component inside the dashboard app shell.
- Send heartbeat updates every 60 seconds while the tab is visible.
- Update `currentPath` when the route changes.
- Treat users as offline automatically when their heartbeat becomes stale.

## User Analytics

Useful metrics:

- Total users
- New users this week/month
- Active vs inactive users
- Dormant users
- Admin vs normal users
- Suspended users
- Locked users
- Last login trend
- First action after signup
- Users who signed up but never added finance data

Suggested admin views:

- User growth chart
- Dormant user list
- Recently active user list
- Users needing attention

## Subscription Analytics

Useful metrics:

- Active subscriptions
- Trialing subscriptions
- Expired subscriptions
- Canceled subscriptions
- Past-due subscriptions
- Monthly vs yearly split
- Admin-granted vs self-service access
- Package-wise users
- Expiring soon
- Estimated MRR
- Estimated ARR
- Average estimated revenue per active subscriber

Suggested admin views:

- Subscription health cards
- Expiring soon table
- Package performance chart
- Blocked users queue

## Feature Usage Analytics

Useful metrics:

- Users with transactions
- Users with accounts
- Users with budgets
- Users with goals
- Users with investments
- Users with notes
- Users with recurring transactions
- Most-used modules
- Least-used modules
- Users who use only one feature

Suggested data sources:

- `Transaction`
- `Account`
- `Budget`
- `Goal`
- `Investment`
- `FinancialNote`
- `RecurringTransaction`

## Finance Activity Analytics

Useful metrics:

- Total transactions created
- Transactions in the last 7/30 days
- Income vs expense volume
- Total tracked account balance
- Total investment value
- Active recurring schedules
- Paused recurring schedules
- Due recurring schedules
- Budget count
- Goal count

These analytics are app-wide operational signals, not personal financial reports for an admin.

## Retention Analytics

Useful metrics:

- Daily active users
- Weekly active users
- Monthly active users
- Users active after signup
- Users inactive for 7/30/90 days
- Users who created their first transaction
- Subscription users who stopped using the app

This requires either `PageView` or `UserActivity` tracking to be accurate.

## Invite Analytics

Useful metrics:

- Pending invites
- Accepted invites
- Expired invites
- Invite acceptance rate
- Invites by admin
- Invites by package
- Time from invite to acceptance

Existing `UserInvite` data already supports most of this.

## Risk / Attention Analytics

Useful metrics:

- Users without access
- Past-due subscriptions
- Expiring subscriptions
- Suspended users
- Locked users
- Dormant paid users
- Users with due recurring transactions
- Users with no login after invite acceptance

Suggested admin view:

- A focused “Needs Attention” panel with direct links to user/subscription management.

## Recommended Implementation Order

1. Add `UserActivity` tracking for online users and last seen data.
2. Add `PageView` tracking for site visit analytics.
3. Add Live Activity cards to `/admin/analytics`.
4. Add Most Visited Routes and Visits Trend charts.
5. Add Feature Usage analytics from existing finance tables.
6. Add Retention analytics from `UserActivity` and `PageView`.
7. Add Invite Analytics from `UserInvite`.
8. Add Needs Attention panel for blocked, expiring, dormant, and past-due users.

## Privacy Notes

- Store hashed IPs, not raw IP addresses.
- Do not store sensitive query strings.
- Avoid tracking form field values.
- Keep analytics admin-only.
- Add retention cleanup later, for example deleting raw page views older than 6-12 months.
