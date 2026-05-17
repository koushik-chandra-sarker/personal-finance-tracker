'use client';

import { useTransition } from 'react';
import { Eye, LogOut } from 'lucide-react';
import { exitSupportViewAction, type SupportViewState } from '@/actions/support.actions';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type Props = {
  supportView: NonNullable<SupportViewState>;
};

export default function SupportViewBanner({ supportView }: Props) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.support;
  const [isPending, startTransition] = useTransition();

  const handleExit = () => {
    startTransition(async () => {
      await exitSupportViewAction();
      window.location.href = '/admin/support';
    });
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">
            {copy.viewingSupportData}: <span className="font-bold">{supportView.user.name}</span> ({supportView.user.email}) {copy.until} {formatDate(supportView.expiresAt, 'MMM dd, h:mm a', locale)}.
          </span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleExit} isLoading={isPending} className="border-amber-300 bg-white/70 text-amber-900 hover:bg-white dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-100">
          <LogOut className="h-4 w-4" />
          {copy.exitSupportView}
        </Button>
      </div>
    </div>
  );
}
