'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { registerUser } from '@/actions/auth.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock, User } from 'lucide-react';
import AppLogo from '@/components/brand/AppLogo';

type RegisterClientProps = {
  inviteToken?: string;
};

export default function RegisterClient({ inviteToken }: RegisterClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as Resolver<RegisterInput>,
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('name', data.name);
      formData.set('email', data.email);
      formData.set('password', data.password);
      formData.set('confirmPassword', data.confirmPassword);
      if (inviteToken) formData.set('inviteToken', inviteToken);

      const result = await registerUser(formData);
      if (result.success) {
        router.push('/login');
      } else {
        setError(result.message);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <AppLogo size="lg" textClassName="text-white" taglineClassName="text-slate-400" />
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8 animate-scale-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white">Create your account</h2>
            <p className="text-sm text-slate-400 mt-1">
              {inviteToken ? 'Complete your invited account setup' : 'Start managing your finances'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="name"
              label="Full Name"
              placeholder="John Doe"
              icon={<User className="h-4 w-4" />}
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Password"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Confirm password"
              icon={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
