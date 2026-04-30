'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from '@/actions/notification.actions';

type Preferences = {
  billRemindersEnabled: boolean;
  billReminderDaysBefore: number;
  budgetAlertsEnabled: boolean;
  budgetWarningThreshold: number;
  budgetCriticalThreshold: number;
  goalDeadlineEnabled: boolean;
  goalReminderDaysBefore: number;
  unusualExpenseEnabled: boolean;
  unusualExpenseMultiplier: number;
  unusualExpenseMinAmount: number;
  lowBalanceEnabled: boolean;
  lowBalanceThreshold: number;
};

const defaults: Preferences = {
  billRemindersEnabled: true,
  billReminderDaysBefore: 3,
  budgetAlertsEnabled: true,
  budgetWarningThreshold: 80,
  budgetCriticalThreshold: 100,
  goalDeadlineEnabled: true,
  goalReminderDaysBefore: 14,
  unusualExpenseEnabled: true,
  unusualExpenseMultiplier: 2,
  unusualExpenseMinAmount: 50,
  lowBalanceEnabled: true,
  lowBalanceThreshold: 100,
};

function SettingToggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
      />
    </label>
  );
}

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getNotificationPreferencesAction()
      .then((data) => setPreferences({ ...defaults, ...data }))
      .finally(() => setIsLoading(false));
  }, []);

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData();
    Object.entries(preferences).forEach(([key, value]) => formData.set(key, String(value)));

    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(formData);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      setTimeout(() => setMessage(null), 3000);
    });
  };

  return (
    <Card>
      <Loader show={isPending} message="Updating notifications..." />
      <div className="flex items-center gap-3 mb-8">
        <Bell className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</h2>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading notification settings...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              {message.text}
            </div>
          )}

          <div className="grid gap-5">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <SettingToggle
                checked={preferences.billRemindersEnabled}
                onChange={(value) => updatePreference('billRemindersEnabled', value)}
                title="Bill reminders"
                description="Notify before active recurring expenses are due."
              />
              <Input
                id="billReminderDaysBefore"
                label="Days before due date"
                type="number"
                min="0"
                max="30"
                value={preferences.billReminderDaysBefore}
                onChange={(e) => updatePreference('billReminderDaysBefore', Number(e.target.value))}
                disabled={!preferences.billRemindersEnabled}
              />
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <SettingToggle
                checked={preferences.budgetAlertsEnabled}
                onChange={(value) => updatePreference('budgetAlertsEnabled', value)}
                title="Budget thresholds"
                description="Notify when category spending crosses warning and critical levels."
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  id="budgetWarningThreshold"
                  label="Warning threshold (%)"
                  type="number"
                  min="1"
                  max="100"
                  value={preferences.budgetWarningThreshold}
                  onChange={(e) => updatePreference('budgetWarningThreshold', Number(e.target.value))}
                  disabled={!preferences.budgetAlertsEnabled}
                />
                <Input
                  id="budgetCriticalThreshold"
                  label="Critical threshold (%)"
                  type="number"
                  min="1"
                  max="200"
                  value={preferences.budgetCriticalThreshold}
                  onChange={(e) => updatePreference('budgetCriticalThreshold', Number(e.target.value))}
                  disabled={!preferences.budgetAlertsEnabled}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <SettingToggle
                checked={preferences.goalDeadlineEnabled}
                onChange={(value) => updatePreference('goalDeadlineEnabled', value)}
                title="Goal deadline reminders"
                description="Notify when an incomplete goal is approaching its deadline."
              />
              <Input
                id="goalReminderDaysBefore"
                label="Days before deadline"
                type="number"
                min="0"
                max="365"
                value={preferences.goalReminderDaysBefore}
                onChange={(e) => updatePreference('goalReminderDaysBefore', Number(e.target.value))}
                disabled={!preferences.goalDeadlineEnabled}
              />
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <SettingToggle
                checked={preferences.unusualExpenseEnabled}
                onChange={(value) => updatePreference('unusualExpenseEnabled', value)}
                title="Unusual expenses"
                description="Notify when a category expense is much larger than recent history."
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  id="unusualExpenseMultiplier"
                  label="Average multiplier"
                  type="number"
                  min="1"
                  max="20"
                  step="0.1"
                  value={preferences.unusualExpenseMultiplier}
                  onChange={(e) => updatePreference('unusualExpenseMultiplier', Number(e.target.value))}
                  disabled={!preferences.unusualExpenseEnabled}
                />
                <Input
                  id="unusualExpenseMinAmount"
                  label="Minimum amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={preferences.unusualExpenseMinAmount}
                  onChange={(e) => updatePreference('unusualExpenseMinAmount', Number(e.target.value))}
                  disabled={!preferences.unusualExpenseEnabled}
                />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <SettingToggle
                checked={preferences.lowBalanceEnabled}
                onChange={(value) => updatePreference('lowBalanceEnabled', value)}
                title="Low balances"
                description="Notify when an active account falls below your threshold."
              />
              <Input
                id="lowBalanceThreshold"
                label="Balance threshold"
                type="number"
                step="0.01"
                value={preferences.lowBalanceThreshold}
                onChange={(e) => updatePreference('lowBalanceThreshold', Number(e.target.value))}
                disabled={!preferences.lowBalanceEnabled}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isPending}>
              Save Notifications
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
