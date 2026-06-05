'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Mail, MessageCircle, Save, ShieldCheck } from 'lucide-react';
import { updateAdminContactSettingsAction, type AdminContactSettingsRow } from '@/actions/app-config.actions';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';

type Props = {
  initialSettings: AdminContactSettingsRow;
};

export default function AdminContactSettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    setErrors(null);
    startTransition(async () => {
      const result = await updateAdminContactSettingsAction(formData);
      if (result.success && result.data) setSettings(result.data);
      setErrors(result.errors || null);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Admin configuration
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">Contact Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Configure the support email used for browser push VAPID contact and the WhatsApp number shown on contact and payment pages.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700/50 dark:bg-slate-800/60">
            <p className="font-black text-slate-900 dark:text-slate-200">Current public values</p>
            <p className="mt-1 break-all text-slate-600 dark:text-slate-400">{settings.contactEmail}</p>
            <p className="mt-1 break-all text-slate-600 dark:text-slate-400">{settings.whatsappNumber || 'WhatsApp not configured'}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={cn(
          'rounded-2xl border px-4 py-3 text-sm font-semibold',
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
        )}>
          {message.text}
        </div>
      )}

      <Card>
        <form onSubmit={submitSettings} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              label="Support contact email"
              defaultValue={settings.contactEmail}
              placeholder="support@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors?.contactEmail?.[0]}
              required
            />
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              label="WhatsApp number"
              defaultValue={settings.whatsappNumber}
              placeholder="016XXXXXXXX or +88016XXXXXXXX"
              icon={<MessageCircle className="h-4 w-4" />}
              error={errors?.whatsappNumber?.[0]}
            />
          </div>

          <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400 md:grid-cols-2">
            <div>
              <p className="font-black text-slate-900 dark:text-slate-200">Email usage</p>
              <p className="mt-1">Used as the VAPID contact email for browser push and shown on the public contact page.</p>
            </div>
            <div>
              <p className="font-black text-slate-900 dark:text-slate-200">WhatsApp usage</p>
              <p className="mt-1">Shown on the public contact page and payment help card. Leave blank to hide the WhatsApp action.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isPending} className="bg-gradient-to-r from-emerald-600 to-slate-900 shadow-emerald-600/20 hover:from-emerald-700 hover:to-slate-800">
              <Save className="h-4 w-4" />
              Save settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
