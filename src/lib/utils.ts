import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_MAP: Record<string, { symbol: string; locale: string; iso?: string }> = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  BDT: { symbol: '৳', locale: 'en-BD' },
  BDT_BN: { symbol: '৳', locale: 'bn-BD', iso: 'BDT' },
  INR: { symbol: '₹', locale: 'en-IN' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
  CAD: { symbol: 'C$', locale: 'en-CA' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
};

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const config = CURRENCY_MAP[currency] || { symbol: currency, locale: 'en-US' };
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.iso || currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string, pattern: string = 'MMM dd, yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatRelativeDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}

export function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function getPercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK: 'Bank Account',
  MOBILE_WALLET: 'Mobile Wallet',
  CREDIT_CARD: 'Credit Card',
  INVESTMENT: 'Investment',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};
