'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ContinuePaymentButtonProps = {
  packageId: string;
  className?: string;
  icon?: 'arrow' | 'check';
};

function paymentHref(packageId: string) {
  return `/subscription/payment?packageId=${encodeURIComponent(packageId)}`;
}

export default function ContinuePaymentButton({ packageId, className, icon = 'check' }: ContinuePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const Icon = icon === 'arrow' ? ArrowRight : CheckCircle2;

  return (
    <Link
      href={paymentHref(packageId)}
      onClick={() => {
        setIsLoading(true);
      }}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
        isLoading && 'pointer-events-none opacity-70',
        className
      )}
    >
      {isLoading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      Continue to Payment <Icon className="h-4 w-4" />
    </Link>
  );
}
