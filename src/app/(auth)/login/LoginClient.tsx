'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { getSession, signIn } from 'next-auth/react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';
import AppLogo from '@/components/brand/AppLogo';
import { useI18n } from '@/i18n/client';
import PublicNav from '@/components/public/PublicNav';

export default function LoginClient() {
  const router = useRouter();
  const { messages } = useI18n();
  const copy = messages.auth;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema) as any,
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        email: data.email,
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
      <PublicNav active="login" dark />
      <div className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <AppLogo size="lg" tagline={messages.brand.tagline} textClassName="text-white" taglineClassName="text-slate-400" />
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 animate-scale-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white">{copy.welcomeBack}</h2>
            <p className="text-sm text-slate-400 mt-1">{copy.signInSubtitle}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="email"
              label={copy.email}
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
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
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              {copy.signIn}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            {copy.noAccount}{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              {copy.createOne}
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
