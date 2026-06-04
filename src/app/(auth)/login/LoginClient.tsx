'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { getSession, signIn } from 'next-auth/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Lock, Smartphone } from 'lucide-react';
import AppLogo from '@/components/brand/AppLogo';
import { useI18n } from '@/i18n/client';
import PublicNav from '@/components/public/PublicNav';

export default function LoginClient() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { messages } = useI18n();
  const copy = messages.auth;
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isDarkTheme = !mounted || resolvedTheme !== 'light';

  useEffect(() => setMounted(true), []);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema) as any,
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        identifier: data.identifier,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setError(copy.invalidLogin);
      } else {
        const session = await getSession();
        router.replace(session?.user?.mustChangePassword ? '/change-password' : '/dashboard');
        router.refresh();
      }
    } catch {
      setError(copy.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-bg">
      <PublicNav active="login" dark={isDarkTheme} />
      <div className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center">
          <div className="rounded-3xl border border-white/80 bg-white px-5 py-3 shadow-2xl shadow-[#042450]/15 ring-1 ring-[#A0BEB9]/50 dark:border-white/10 dark:shadow-black/25">
            <AppLogo size="lg" tagline={messages.brand.tagline} />
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 animate-scale-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-[#042450] dark:text-white">{copy.welcomeBack}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{copy.signInSubtitle}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="identifier"
              label={copy.loginIdentifier || 'Phone number or email'}
              type="text"
              inputMode="text"
              placeholder="01XXXXXXXXX or you@example.com"
              icon={<Smartphone className="h-4 w-4" />}
              error={errors.identifier?.message}
              {...register('identifier')}
            />
            <Input
              id="password"
              label={copy.password}
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full bg-gradient-to-r from-[#028D36] to-[#042450] shadow-[#028D36]/20 hover:from-[#027c31] hover:to-[#18365D] focus:ring-[#028D36]/40" size="lg" isLoading={loading}>
              {copy.signIn}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            {copy.noAccount}{' '}
            <Link href="/register" className="font-medium text-[#028D36] hover:text-[#026d2c] dark:text-emerald-300 dark:hover:text-emerald-200">
              {copy.createOne}
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
