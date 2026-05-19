'use client';

import { useEffect } from 'react';
import Card from '@/components/ui/Card';
import { ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useI18n } from '@/i18n/client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { messages } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center py-10">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 mb-2">{messages.error.accessDenied}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {error.message || messages.error.noPermission}
        </p>
        <Button onClick={() => window.location.href = '/dashboard'}>
          {messages.error.goBackSafely}
        </Button>
      </Card>
    </div>
  );
}
