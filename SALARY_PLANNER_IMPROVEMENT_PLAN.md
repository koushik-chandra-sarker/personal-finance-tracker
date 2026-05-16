# Salary Planner Improvement Plan

## Current Shape

The Salary Planner already covers the core calculator experience:

- Monthly gross salary input
- Festival bonus months
- Custom salary structure
- Monthly deductions
- Bangladesh tax slab breakdown
- Salary charts
- Budget planner based on net monthly income
- Admin-managed tax slab configuration

The next improvements should turn it from a standalone calculator into a planning tool that connects with the rest of takaPilot.

## Recommended Improvements

### 1. Save Salary Plans

Allow each user to save multiple salary scenarios, such as:

- Current Job
- New Offer
- Promotion Scenario
- Freelance Income Scenario

Each saved plan should store:

- Gross monthly salary
- Bonus months
- Tax category
- Salary structure percentages
- Deductions
- Budget allocation
- Fiscal year

This will let users return to previous calculations instead of rebuilding them every time.

### 2. Compare Job Offers

Add a comparison mode where users can compare two saved salary plans.

Useful comparison values:

- Monthly gross difference
- Monthly net take-home difference
- Annual gross difference
- Annual net difference
- Additional tax
- Effective tax rate difference
- Savings impact based on budget plan

This would make the planner useful for real decisions like accepting a new job offer.

### 3. Fix Fiscal Year Handling

The UI currently calculates the fiscal year dynamically, but the page fetches tax configs using a fixed fiscal year.

Improve this by:

- Calculating the active fiscal year on the server
- Fetching tax configs for that fiscal year
- Adding a fiscal year selector if multiple tax configs exist
- Showing a warning if no active tax config exists for the selected year

This keeps tax calculations aligned with the actual current year.

### 4. Make Tax Calculation More Complete

Improve Bangladesh tax handling with:

- Minimum tax by location
- Investment rebate support
- Surcharge support
- More taxpayer categories if needed
- Clear estimated-tax messaging

The planner should clearly present tax as an estimate, not a final legal filing calculation.

### 5. Connect Planner With Real App Data

Connect the planner to the existing finance app features.

Possible integrations:

- Pull salary from recurring income or income transactions
- Create or update a monthly budget from the budget planner
- Push savings allocation into goals
- Suggest account allocation after salary is received
- Show how the planned budget compares with actual spending

This is the biggest product improvement because it turns the planner into part of the user’s real money workflow.

### 6. Improve Validation

Add validation for impossible or risky salary structures.

Examples:

- Basic salary plus allowances exceeds gross salary
- Deduction percentage is too high
- Total budget allocation is below or above 100%
- Net monthly income becomes negative

The UI should show clear warnings instead of silently hiding calculation issues.

### 7. Add Payroll Date Planning

Let users enter salary and bill dates, then show a simple monthly cash-flow plan.

Useful inputs:

- Salary payment date
- Rent date
- Loan or EMI dates
- DPS or savings transfer dates
- Utility bill dates

Useful outputs:

- Month timeline
- Expected balance pressure points
- Suggested transfer dates
- Warning if planned expenses happen before salary arrives

### 8. Add Export And Sharing

Add export options so users can keep or share their salary plan.

Useful formats:

- Printable view
- PDF export
- Copyable text summary

This is especially helpful for offer comparison and personal financial planning.

## Recommended Implementation Order

1. Fix fiscal year handling.
2. Add validation warnings.
3. Add saved salary scenarios.
4. Add compare mode.
5. Connect budget planner output with the app budget feature.
6. Add goal and account allocation suggestions.
7. Add payroll date planning.
8. Add export and printable summary.

## First Implementation Milestone

The best first milestone is:

- Dynamic fiscal year tax config loading
- Saved salary scenarios
- Compare two salary scenarios
- Validation for impossible salary structures

This milestone will make the planner reliable, reusable, and useful for real salary decisions.
