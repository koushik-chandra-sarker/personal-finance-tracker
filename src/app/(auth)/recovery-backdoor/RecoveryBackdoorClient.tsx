'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { backdoorResetSchema, type BackdoorResetInput } from '@/lib/validations/auth';
import { backdoorResetPasswordAction } from '@/actions/auth.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ShieldAlert, Mail, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RecoveryBackdoorClient() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<BackdoorResetInput>({
    resolver: zodResolver(backdoorResetSchema) as Resolver<BackdoorResetInput>,
  });

  const onSubmit = async (data: BackdoorResetInput) => {
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('newPassword', data.newPassword);
    formData.append('confirmPassword', data.confirmPassword);

    try {
      const result = await backdoorResetPasswordAction(formData);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen auth-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-slate-400 mb-8">
              Your password has been updated successfully. You can now sign in with your new credentials.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/20">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Recovery Mode</h1>
          <p className="text-slate-400 mt-2 text-center">
            Development-only recovery is enabled for this session.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 animate-scale-in">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-3">
              <div className="shrink-0 mt-0.5">!</div>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              id="email"
              label="User Email"
              type="email"
              placeholder="Target account email"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            
            <div className="space-y-4 pt-2">
              <Input
                id="newPassword"
                label="New Password"
                type="password"
                placeholder="New password"
                icon={<Lock className="h-4 w-4" />}
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <Input
                id="confirmPassword"
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new password"
                icon={<Lock className="h-4 w-4" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <Button type="submit" className="w-full mt-4" size="lg" isLoading={loading}>
              Reset Password
            </Button>
          </form>

          <Link 
            href="/login" 
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 mt-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
