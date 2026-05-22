'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useState, useTransition } from 'react';
import { KeyRound, LifeBuoy, LockKeyhole, PlayCircle, ShieldCheck, X } from 'lucide-react';
import { createAppPinAction, remindAppPinLaterAction, verifyAppPinAction } from '@/actions/app-pin.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

type PinGateState = {
  hasPin: boolean;
  isUnlocked: boolean;
  userId: string;
  unlockKey: string | null;
  reminderAt: string | null;
};

type Props = {
  state: PinGateState;
  children: React.ReactNode;
};

function isPinBypassPath(pathname: string) {
  return pathname.startsWith('/support')
    || pathname.startsWith('/admin/support')
    || pathname.startsWith('/tutorials')
    || pathname.startsWith('/admin/tutorials');
}

function tabUnlockStorageKey(userId: string, unlockKey: string | null) {
  return unlockKey ? `pft:app-pin:tab-unlock:${userId}:${unlockKey}` : null;
}

export default function AppPinGate({ state, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasPin, setHasPin] = useState(state.hasPin);
  const [isUnlocked, setIsUnlocked] = useState(!state.hasPin);
  const [isCheckingTabUnlock, setIsCheckingTabUnlock] = useState(state.hasPin);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canBypassPin = isPinBypassPath(pathname);
  const isReminderDue = !state.reminderAt || new Date(state.reminderAt) <= new Date();
  const shouldLock = hasPin && !isCheckingTabUnlock && !isUnlocked && !canBypassPin;
  const shouldSuggestPin = !hasPin && !isPromptDismissed && isReminderDue && !canBypassPin;
  const storageKey = tabUnlockStorageKey(state.userId, state.unlockKey);

  useEffect(() => {
    let cancelled = false;
    const syncTabUnlock = () => {
      if (cancelled) return;

      if (!state.hasPin || !storageKey) {
        setHasPin(state.hasPin);
        setIsUnlocked(!state.hasPin);
        setIsCheckingTabUnlock(false);
        return;
      }

      setHasPin(true);
      setIsUnlocked(state.isUnlocked && sessionStorage.getItem(storageKey) === '1');
      setIsCheckingTabUnlock(false);
    };

    queueMicrotask(syncTabUnlock);
    return () => {
      cancelled = true;
    };
  }, [state.hasPin, state.isUnlocked, storageKey]);

  const markTabUnlocked = () => {
    if (storageKey) sessionStorage.setItem(storageKey, '1');
    setIsUnlocked(true);
    setIsCheckingTabUnlock(false);
  };

  const handleVerify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await verifyAppPinAction(formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        markTabUnlocked();
        form.reset();
        router.refresh();
      }
    });
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createAppPinAction(formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        setHasPin(true);
        if (result.data?.unlockKey) {
          const nextStorageKey = tabUnlockStorageKey(state.userId, result.data.unlockKey);
          if (nextStorageKey) sessionStorage.setItem(nextStorageKey, '1');
          setIsUnlocked(true);
          setIsCheckingTabUnlock(false);
        } else {
          markTabUnlocked();
        }
        setIsSetupOpen(false);
        form.reset();
        router.refresh();
      }
    });
  };

  const handleRemindLater = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await remindAppPinLaterAction();
      if (result.success) {
        setIsPromptDismissed(true);
        router.refresh();
        return;
      }
      setFeedback({ type: 'error', text: result.message });
    });
  };

  if (hasPin && isCheckingTabUnlock && !canBypassPin) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 shadow-2xl shadow-black/30">
          <KeyRound className="h-5 w-5 text-indigo-200" />
          <span className="text-sm font-semibold text-slate-100">Checking PIN session...</span>
        </div>
      </div>
    );
  }

  if (shouldLock) {
    return (
      <div className="min-h-[100dvh] overflow-y-auto bg-slate-950 px-4 py-6 text-white sm:px-6">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl flex-col justify-center">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/20">
                <LockKeyhole className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-200">Security check</p>
                <h1 className="mt-3 max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl">Enter your app PIN to continue</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Your account has a security PIN enabled. It is required once per browser tab before opening private finance pages.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/support" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">
                  <LifeBuoy className="h-4 w-4" />
                  Support
                </Link>
                <Link href="/tutorials" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">
                  <PlayCircle className="h-4 w-4" />
                  Tutorials
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/20"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white">Unlock session</h2>
                  <p className="text-xs text-slate-400">This unlock expires when this tab is closed.</p>
                </div>
              </div>

              {feedback && (
                <div className={`mb-4 rounded-xl border p-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : 'border-rose-400/30 bg-rose-500/10 text-rose-100'}`}>
                  {feedback.text}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <Input
                  id="app-pin"
                  name="pin"
                  label="PIN"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={4}
                  maxLength={6}
                  placeholder="Enter 4-6 digits"
                  required
                />
                <Button type="submit" className="w-full" isLoading={isPending}>
                  <ShieldCheck className="h-4 w-4" />
                  Unlock
                </Button>
              </form>

              <div className="mt-5 rounded-2xl bg-slate-950/50 p-4 text-sm text-slate-300">
                Forgot your PIN? Open a support ticket and support can reset it after verification.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}

      {shouldSuggestPin && (
        <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-indigo-500/30 dark:bg-slate-900 dark:shadow-black/30">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-200">Create an app PIN</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">Add a tab-session PIN for private finance pages. Support and tutorials stay available.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPromptDismissed(true)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  aria-label="Dismiss PIN suggestion"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => setIsSetupOpen(true)}>
                  Create PIN
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleRemindLater} isLoading={isPending}>
                  Remind me in 7 days
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isSetupOpen} onClose={() => setIsSetupOpen(false)} title="Create App PIN" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            Use 4 to 6 digits. You will enter this PIN whenever a new browser tab session opens.
          </div>
          {feedback && (
            <div className={`rounded-xl border p-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
              {feedback.text}
            </div>
          )}
          <Input id="new-app-pin" name="pin" label="PIN" type="password" inputMode="numeric" minLength={4} maxLength={6} required />
          <Input id="confirm-app-pin" name="confirmPin" label="Confirm PIN" type="password" inputMode="numeric" minLength={4} maxLength={6} required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsSetupOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isPending}>Create PIN</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
