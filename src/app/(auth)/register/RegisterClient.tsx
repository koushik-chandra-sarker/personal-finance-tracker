'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { getSession, signIn } from 'next-auth/react';
import { CheckCircle2, Lock, Mail, ShieldCheck, Smartphone, User } from 'lucide-react';
import { registerUser, sendRegistrationOtpAction, verifyRegistrationOtpAction } from '@/actions/auth.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AppLogo from '@/components/brand/AppLogo';
import { useI18n } from '@/i18n/client';
import PublicNav from '@/components/public/PublicNav';

type RegisterClientProps = {
  inviteToken?: string;
};

type RegisterStep = 'phone' | 'otp' | 'password' | 'details';

export default function RegisterClient({ inviteToken }: RegisterClientProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { messages, locale } = useI18n();
  const copy = messages.auth;
  const isBangla = locale === 'bn-BD';
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<RegisterStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpVerificationId, setOtpVerificationId] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isDarkTheme = !mounted || resolvedTheme !== 'light';

  useEffect(() => setMounted(true), []);

  const steps = [
    isBangla ? 'ফোন' : 'Phone',
    isBangla ? 'ওটিপি' : 'OTP',
    isBangla ? 'পাসওয়ার্ড' : 'Password',
    isBangla ? 'তথ্য' : 'Details',
  ];
  const activeStepIndex = ['phone', 'otp', 'password', 'details'].indexOf(step);

  const handleOtpRequest = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.set('phoneNumber', phoneNumber);
    const result = await sendRegistrationOtpAction(formData);
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setNormalizedPhone(result.data.phoneNumber);
    setOtpVerificationId(result.data.verificationId);
    setDevOtp(result.data.devOtp || null);
    setStep('otp');
  };

  const handleOtpVerify = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.set('phoneNumber', normalizedPhone || phoneNumber);
    formData.set('otpCode', otpCode);
    const result = await verifyRegistrationOtpAction(formData);
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setNormalizedPhone(result.data.phoneNumber);
    setOtpVerificationId(result.data.verificationId);
    setStep('password');
  };

  const handlePasswordStep = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(isBangla ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isBangla ? 'পাসওয়ার্ড মিলছে না।' : 'Passwords do not match.');
      return;
    }
    setStep('details');
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.set('username', username);
    formData.set('phoneNumber', normalizedPhone || phoneNumber);
    formData.set('otpVerificationId', otpVerificationId);
    formData.set('password', password);
    formData.set('confirmPassword', confirmPassword);
    if (email.trim()) formData.set('email', email.trim());
    if (inviteToken) formData.set('inviteToken', inviteToken);

    const result = await registerUser(formData);
    if (!result.success) {
      setLoading(false);
      setError(result.message);
      return;
    }

    const signInResult = await signIn('credentials', {
      identifier: normalizedPhone || phoneNumber,
      password,
      redirect: false,
    });
    if (signInResult?.error) {
      setLoading(false);
      router.push('/login');
      return;
    }

    const session = await getSession();
    const hasActiveSubscription =
      session?.user?.role === 'ADMIN' ||
      (
        session?.user?.subscriptionPlan === 'PRO' &&
        (session.user.subscriptionStatus === 'ACTIVE' || session.user.subscriptionStatus === 'TRIALING') &&
        (!session.user.subscriptionCurrentPeriodEnd || new Date(session.user.subscriptionCurrentPeriodEnd) >= new Date())
      );
    const nextPath = hasActiveSubscription ? '/dashboard' : '/subscription?reason=missing&next=/dashboard';
    router.replace(`/onboarding?next=${encodeURIComponent(nextPath)}`);
    router.refresh();
  };

  const title = isBangla ? 'ধাপে ধাপে অ্যাকাউন্ট তৈরি করুন' : 'Create your account step by step';
  const subtitle = inviteToken
    ? copy.registerInviteSubtitle
    : isBangla
      ? 'ফোন নম্বর যাচাই করে নিরাপদ অ্যাকাউন্ট তৈরি করুন'
      : 'Verify your phone number and set up a secure account';

  return (
    <div className="min-h-screen auth-bg">
      <PublicNav active="register" dark={isDarkTheme} />
      <div className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center justify-center">
            <div className="rounded-3xl border border-white/80 bg-white px-5 py-3 shadow-2xl shadow-[#042450]/15 ring-1 ring-[#A0BEB9]/50 dark:border-white/10 dark:shadow-black/25">
              <AppLogo size="lg" tagline={messages.brand.tagline} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 animate-scale-in sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-[#042450] dark:text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-2">
              {steps.map((label, index) => (
                <div key={label} className="min-w-0">
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${index <= activeStepIndex ? 'bg-[#028D36] text-white dark:bg-[#25A255]' : 'bg-[#D8E5E3]/65 text-[#2E506B] dark:bg-white/10 dark:text-slate-400'}`}>
                    {index < activeStepIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                  <p className="mt-2 truncate text-center text-[11px] font-bold text-slate-600 dark:text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            {step === 'phone' && (
              <form onSubmit={handleOtpRequest} className="space-y-4">
                <Input id="phoneNumber" label={isBangla ? 'ফোন নম্বর' : 'Phone number'} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" icon={<Smartphone className="h-4 w-4" />} value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required />
                <Button type="submit" className="w-full bg-gradient-to-r from-[#028D36] to-[#042450] shadow-[#028D36]/20 hover:from-[#027c31] hover:to-[#18365D] focus:ring-[#028D36]/40" size="lg" isLoading={loading}>{isBangla ? 'ওটিপি পাঠান' : 'Send OTP'}</Button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div className="rounded-xl border border-[#A0BEB9] bg-[#D8E5E3]/70 p-3 text-sm text-[#042450] dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                  {isBangla ? 'ওটিপি পাঠানো হয়েছে' : 'OTP sent to'} {normalizedPhone || phoneNumber}
                  {devOtp ? <span className="mt-2 block font-black text-slate-950 dark:text-white">{isBangla ? 'ডেমো ওটিপি' : 'Demo OTP'}: {devOtp}</span> : null}
                </div>
                <Input id="otpCode" label={isBangla ? '৬ ডিজিট ওটিপি' : '6 digit OTP'} type="text" inputMode="numeric" placeholder="123456" icon={<ShieldCheck className="h-4 w-4" />} value={otpCode} onChange={(event) => setOtpCode(event.target.value)} required />
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="w-full" onClick={() => setStep('phone')}>{isBangla ? 'ফিরুন' : 'Back'}</Button>
                  <Button type="submit" className="w-full bg-gradient-to-r from-[#028D36] to-[#042450] shadow-[#028D36]/20 hover:from-[#027c31] hover:to-[#18365D] focus:ring-[#028D36]/40" isLoading={loading}>{isBangla ? 'যাচাই করুন' : 'Verify'}</Button>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handlePasswordStep} className="space-y-4">
                <Input id="password" label={copy.password} type="password" placeholder="Password" icon={<Lock className="h-4 w-4" />} value={password} onChange={(event) => setPassword(event.target.value)} required />
                <Input id="confirmPassword" label={copy.confirmPassword} type="password" placeholder="Confirm password" icon={<Lock className="h-4 w-4" />} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                <Button type="submit" className="w-full bg-gradient-to-r from-[#028D36] to-[#042450] shadow-[#028D36]/20 hover:from-[#027c31] hover:to-[#18365D] focus:ring-[#028D36]/40" size="lg">{isBangla ? 'চালিয়ে যান' : 'Continue'}</Button>
              </form>
            )}

            {step === 'details' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <Input id="username" label={isBangla ? 'ইউজারনেম' : 'Username'} placeholder={isBangla ? 'আপনার নাম' : 'Your name'} icon={<User className="h-4 w-4" />} value={username} onChange={(event) => setUsername(event.target.value)} required />
                <Input id="email" label={isBangla ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'} type="email" placeholder="you@example.com" icon={<Mail className="h-4 w-4" />} value={email} onChange={(event) => setEmail(event.target.value)} />
                <Button type="submit" className="w-full bg-gradient-to-r from-[#028D36] to-[#042450] shadow-[#028D36]/20 hover:from-[#027c31] hover:to-[#18365D] focus:ring-[#028D36]/40" size="lg" isLoading={loading}>{copy.createAccount}</Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              {copy.alreadyAccount}{' '}
              <Link href="/login" className="font-medium text-[#028D36] hover:text-[#026d2c] dark:text-emerald-300 dark:hover:text-emerald-200">
                {copy.signInLink}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
