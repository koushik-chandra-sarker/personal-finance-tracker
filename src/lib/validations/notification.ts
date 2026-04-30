import { z } from 'zod';

const checkbox = z.preprocess(
  (value) => value === true || value === 'true' || value === 'on' || value === '1',
  z.boolean()
);

export const notificationPreferenceSchema = z.object({
  billRemindersEnabled: checkbox.default(false),
  billReminderDaysBefore: z.coerce.number().int().min(0).max(30),
  budgetAlertsEnabled: checkbox.default(false),
  budgetWarningThreshold: z.coerce.number().int().min(1).max(100),
  budgetCriticalThreshold: z.coerce.number().int().min(1).max(200),
  goalDeadlineEnabled: checkbox.default(false),
  goalReminderDaysBefore: z.coerce.number().int().min(0).max(365),
  unusualExpenseEnabled: checkbox.default(false),
  unusualExpenseMultiplier: z.coerce.number().min(1).max(20),
  unusualExpenseMinAmount: z.coerce.number().min(0).max(999999999),
  lowBalanceEnabled: checkbox.default(false),
  lowBalanceThreshold: z.coerce.number().min(-999999999).max(999999999),
}).refine(
  (data) => data.budgetWarningThreshold <= data.budgetCriticalThreshold,
  {
    message: 'Warning threshold must be less than or equal to critical threshold',
    path: ['budgetWarningThreshold'],
  }
);

export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
