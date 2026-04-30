# Feature Ideas

This project already supports accounts, categories, transactions, budgets, recurring transactions, goals, reports, insights, notifications, and shared access. The next features should reduce manual entry and make the existing financial data more actionable.

## Top Recommendations

### 1. Transaction Import

Add CSV import for bank and card statements.

Scope:
- Upload a CSV file.
- Map columns to transaction fields.
- Preview parsed rows before saving.
- Detect likely duplicates by date, amount, account, and description.
- Save valid rows in bulk.

Why:
- Manual transaction entry is the biggest friction point.
- This fits the existing transaction, account, and category models.

### 2. Budget Forecasting

Predict whether each budget is likely to be exceeded before month end.

Scope:
- Compare current spend rate with the monthly budget.
- Show projected month-end spend per category.
- Mark budgets as on track, at risk, or exceeded.
- Add dashboard insight messages for risky budgets.

Why:
- Current budget tracking is reactive.
- Forecasting helps users adjust before overspending happens.

### 3. Audit Activity Log

Add an activity feed for shared workspaces.

Scope:
- Track create, update, and delete events for transactions, budgets, goals, accounts, and categories.
- Show who made each change.
- Include timestamp, feature type, and short summary.
- Filter by collaborator, feature, and date range.

Why:
- The schema already has shared access plus creator/updater fields.
- Collaboration needs visibility and accountability.

## Other Candidates

- Smart auto-categorization based on similar past transactions.
- Bill calendar for recurring payments and income.
- Subscription detection for repeated charges.
- Net worth tracking with account balance snapshots.
- Goal auto-funding rules.
- Receipt attachments for transactions.
- Better notifications for bills, budget thresholds, goal deadlines, unusual expenses, and low balances.
