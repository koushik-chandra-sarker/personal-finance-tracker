# Bangla Support Rollout Plan

## Goal

- Default language: Bangla
- Primary locale: `bn-BD`
- Fallback language: English
- Fallback locale: `en-US`
- Keep existing routes like `/dashboard`, `/transactions`, and `/admin/users` working.

This should be implemented as a staged product migration, not a one-shot text replacement. The app has many finance, admin, support, subscription, and notification flows, so the safest approach is to add a real localization layer first, then translate page groups phase by phase.

## Recommended Strategy

Do not move the whole app to `/bn-BD/...` routes in the first pass.

This is an authenticated finance app with many existing routes, guards, redirects, support links, payment links, and admin paths. A cookie and user-setting based language layer gives Bangla-default support with lower risk. Locale-prefixed public routes can be added later if needed.

## Phase 1: I18n Foundation

- Add central locale config with `bn-BD` as default and `en-US` as fallback.
- Add translation dictionaries, likely:
  - `src/i18n/messages/bn-BD.ts`
  - `src/i18n/messages/en-US.ts`
  - `src/i18n/config.ts`
  - `src/i18n/format.ts`
- Add server and client translation helpers.
- Set root `<html lang="bn-BD">`.
- Replace current English metadata with Bangla metadata.
- Add a Bangla-capable font setup. The app currently uses Inter, so add a Bengali font such as `Noto Sans Bengali`.
- Add language persistence:
  - Guest users: cookie
  - Logged-in users: `User.preferredLocale`
- Add a language switcher in Settings and probably Topbar.

## Phase 2: Formatting Layer

- Update `formatCurrency`, `formatDate`, `formatRelativeDate`, month names, and number formatting to accept locale.
- Default BDT display should use Bangla locale formatting, for example `bn-BD`.
- Avoid using fake currency codes like `BDT_BN` as the main solution. Currency and language should be separate.
- Translate common enum display labels:
  - Account types
  - Transaction types
  - Frequencies
  - Subscription intervals
  - Support ticket statuses
  - Investment cashflow and status labels
- Make chart labels, tooltips, empty states, table headers, and badges locale-aware.

## Phase 3: App Shell And Auth

Translate the global surfaces first because they appear everywhere:

- Sidebar
- Topbar
- App logo tagline
- Loading and error pages
- Login
- Register
- Forced password change
- Recovery page
- Subscription blocked messages
- Payment and onboarding flow

This gives the app a Bangla-first feel quickly.

## Phase 4: Core Finance Pages

Translate the main user workflows:

- Dashboard
- Transactions
- Accounts
- Categories
- Budgets
- Goals
- Recurring transactions
- Reports
- Notes
- Subscription Tracker

Also translate all form labels, placeholders, validation messages, action success/error messages, and confirmation dialogs.

## Phase 5: Bangladesh-Specific Finance Modules

Translate and localize the modules where Bangla matters most:

- Salary Planner
- Tax Config
- Investments
- Sanchayapatra calculator
- Investment portfolio, detail, and type pages
- Maturity reminders and investment notifications

This phase should also verify Bangladesh fiscal-year wording, tax copy, and financial terminology so it sounds natural, not machine-translated.

## Phase 6: Support, Notifications, And Tutorials

Translate interaction-heavy systems:

- Support tickets
- Admin support view
- Notification bell
- Popup notifications and sound messages
- Tutorials
- Admin messages shown to users

Important rule: user-written content should not be automatically translated. Only system labels, templates, statuses, and generated messages should be localized.

## Phase 7: Admin Area

Translate admin workflows carefully:

- Analytics
- User management
- Subscription management
- Manual payments
- Admin messages
- Support admin
- Investment config
- Tutorial management
- Tax config

Admin tables should stay compact. Bangla labels are often longer, so responsive layout and column overflow should be checked carefully here.

## Phase 8: Data, Seeds, And Templates

- Update seed and test demo data where appropriate.
- Add Bangla default tutorial content if the tutorial system is meant for Bangla users.
- Translate notification templates.
- Translate default admin messages or system-generated copy.
- Keep database enum values in English and code-safe format; only display labels in Bangla.

## Phase 9: QA And Rollout

- Run `npm run build`.
- Check major routes manually in Bangla.
- Check mobile sidebar, topbar, and table layouts.
- Check forms with Bangla labels and long validation messages.
- Verify server actions still return translated messages.
- Verify logged-in locale preference survives reload, logout, and login.
- Confirm default new users land in Bangla.
- Confirm old users also default to Bangla unless they explicitly choose English.

## Implementation Order

1. Foundation and formatting.
2. App shell, auth, and subscription.
3. Dashboard, transactions, accounts, budgets, and goals.
4. Reports, recurring transactions, notes, and service tracker.
5. Investments, salary planner, and tax.
6. Support, notifications, and tutorials.
7. Admin.
8. QA polish.

