'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { processDueRecurringAction } from '@/actions/recurring.actions';

export default function RecurringAutoProcessor() {
  const router = useRouter();

  useEffect(() => {
    console.log('Processing due recurring transactions...');
    processDueRecurringAction()
      .then((result) => {
        console.log('Recurring transactions processed:', result);
        if (result.processed > 0) router.refresh();
      })
      .catch((error) => {
        console.error('Failed to process due recurring transactions:', error);
      });
  }, [router]);

  return null;
}
