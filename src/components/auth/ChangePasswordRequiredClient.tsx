'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { completeFirstLoginPasswordAction } from '@/actions/auth.actions';
import { firstLoginPasswordSchema, type FirstLoginPasswordInput } from '@/lib/validations/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useI18n } from '@/i18n/client';

type ChangePasswordRequiredClientProps = {
  searchParams: { next?: string | string[] };
};

function getNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  if (next.startsWith('/change-password')) return '/dashboard';
  return next;
}

export default function ChangePasswordRequiredClient({ searchParams }: ChangePasswordRequiredClientProps) {
  const router = useRouter();
  const { update } = useSession();
  const { messages } = useI18n();
  const copy = messages.auth;
  const nextPath = getNextPath(searchParams.next);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, formState: { errors } } = useForm<FirstLoginPasswordInput>({
    resolver: zodResolver(firstLoginPasswordSchema) as any,
  });

  const onSubmit = (data: FirstLoginPasswordInput) => {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('newPassword', data.newPassword);
      formData.set('confirmPassword', data.confirmPassword);

      const result = await completeFirstLoginPasswordAction(formData);
      if (!result.success) {
        setMessage({ type: 'error', text: result.message });
        return;
      }

      await update({ mustChangePassword: false });
      setMessage({ type: 'success', text: result.message });
      router.replace(nextPath);
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{copy.updatePassword}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.updatePasswordSubtitle}</p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="newPassword"
            label={copy.newPassword}
            type="password"
            icon={<ShieldCheck className="h-4 w-4" />}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            id="confirmPassword"
            label={copy.confirmNewPassword}
            type="password"
            icon={<ShieldCheck className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
            {copy.updatePassword}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {copy.cannotSkip}
        </p>
      </div>
    </div>
  );
}
