'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Sparkles } from 'lucide-react';
import { activateTrialPackageAction } from '@/actions/settings.actions';
import Button from '@/components/ui/Button';
import { useI18n } from '@/i18n/client';

type StartTrialButtonProps = {
  packageId: string;
  className?: string;
};

export default function StartTrialButton({ packageId, className }: StartTrialButtonProps) {
  const router = useRouter();
  const { update } = useSession();
  const { messages } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const startTrial = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await activateTrialPackageAction(packageId);
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      await update(result.data);
      router.replace('/dashboard');
      router.refresh();
    });
  };

  return (
    <div className={className}>
      <Button type="button" className="w-full" isLoading={isPending} onClick={startTrial}>
        {isPending ? messages.subscription.startingTrial : messages.subscription.startTrial}
        <Sparkles className="h-4 w-4" />
      </Button>
      {message && (
        <p className="mt-2 text-center text-xs font-medium text-rose-600 dark:text-rose-300">{message}</p>
      )}
    </div>
  );
}
