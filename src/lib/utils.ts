import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from '@/i18n/config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_LOCALE_MAP = {
  'bn-BD': bn,
  'en-US': enUS,
} as const;

const CURRENCY_MAP: Record<string, { iso: string }> = {
  USD: { iso: 'USD' },
  EUR: { iso: 'EUR' },
  GBP: { iso: 'GBP' },
  BDT: { iso: 'BDT' },
  BDT_BN: { iso: 'BDT' },
  INR: { iso: 'INR' },
  JPY: { iso: 'JPY' },
  CAD: { iso: 'CAD' },
  AUD: { iso: 'AUD' },
};

export function getActiveLocale(locale?: string | null): AppLocale {
  if (isAppLocale(locale)) return locale;
  if (typeof document !== 'undefined') {
    const documentLocale = document.documentElement.lang;
    if (isAppLocale(documentLocale)) return documentLocale;
  }
  return DEFAULT_LOCALE;
}

export function getIntlLocale(locale?: string | null) {
  return getActiveLocale(locale);
}

export function formatNumber(
  value: number | string,
  options?: Intl.NumberFormatOptions,
  locale?: string | null
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat(getIntlLocale(locale), options).format(Number.isFinite(num) ? num : 0);
}

export function formatCurrency(amount: number | string, currency: string = 'BDT', locale?: string | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const normalizedCurrency = currency === 'BDT_BN' ? 'BDT' : currency;
  const config = CURRENCY_MAP[currency] || CURRENCY_MAP[normalizedCurrency] || { iso: normalizedCurrency };

  const safeAmount = Number.isFinite(num) ? num : 0;
  try {
    return new Intl.NumberFormat(getIntlLocale(locale), {
      style: 'currency',
      currency: config.iso,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${normalizedCurrency} ${formatNumber(safeAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }, locale)}`;
  }
}

export function formatDate(date: Date | string, pattern: string = 'MMM dd, yyyy', locale?: string | null): string {
  const activeLocale = getActiveLocale(locale);
  return format(new Date(date), pattern, { locale: DATE_LOCALE_MAP[activeLocale] });
}

export function formatRelativeDate(date: Date | string, locale?: string | null): string {
  const activeLocale = getActiveLocale(locale);
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: DATE_LOCALE_MAP[activeLocale] });
}

export function getMonthName(month: number, locale?: string | null): string {
  if (month < 1 || month > 12) return '';
  return new Intl.DateTimeFormat(getIntlLocale(locale), { month: 'long' }).format(new Date(2024, month - 1, 1));
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

const LOCALIZED_LABELS = {
  accountType: {
    'bn-BD': {
      CASH: 'নগদ',
      BANK: 'ব্যাংক অ্যাকাউন্ট',
      MOBILE_WALLET: 'মোবাইল ওয়ালেট',
      CREDIT_CARD: 'ক্রেডিট কার্ড',
      INVESTMENT: 'বিনিয়োগ',
    },
    'en-US': ACCOUNT_TYPE_LABELS,
  },
  frequency: {
    'bn-BD': {
      DAILY: 'প্রতিদিন',
      WEEKLY: 'প্রতি সপ্তাহে',
      BIWEEKLY: 'দুই সপ্তাহে একবার',
      MONTHLY: 'প্রতি মাসে',
      QUARTERLY: 'প্রতি তিন মাসে',
      HALF_YEARLY: 'ছয় মাসে একবার',
      YEARLY: 'প্রতি বছর',
      AT_MATURITY: 'মেয়াদ শেষে',
      ON_SALE: 'বিক্রির সময়',
    },
    'en-US': {
      ...FREQUENCY_LABELS,
      HALF_YEARLY: 'Half Yearly',
      AT_MATURITY: 'At Maturity',
      ON_SALE: 'On Sale',
    },
  },
  transactionType: {
    'bn-BD': {
      INCOME: 'আয়',
      EXPENSE: 'ব্যয়',
    },
    'en-US': {
      INCOME: 'Income',
      EXPENSE: 'Expense',
    },
  },
  subscriptionInterval: {
    'bn-BD': {
      MONTHLY: 'মাসিক',
      YEARLY: 'বার্ষিক',
    },
    'en-US': {
      MONTHLY: 'Monthly',
      YEARLY: 'Yearly',
    },
  },
  subscriptionStatus: {
    'bn-BD': {
      ACTIVE: 'সক্রিয়',
      TRIALING: 'ট্রায়াল চলছে',
      PAST_DUE: 'বকেয়া',
      CANCELED: 'বাতিল',
      MISSING: 'সাবস্ক্রিপশন নেই',
    },
    'en-US': {
      ACTIVE: 'Active',
      TRIALING: 'Trialing',
      PAST_DUE: 'Past Due',
      CANCELED: 'Canceled',
      MISSING: 'Missing',
    },
  },
  userStatus: {
    'bn-BD': {
      ACTIVE: 'সক্রিয়',
      SUSPENDED: 'স্থগিত',
      INVITED: 'আমন্ত্রিত',
      DELETED: 'মুছে ফেলা',
    },
    'en-US': {
      ACTIVE: 'Active',
      SUSPENDED: 'Suspended',
      INVITED: 'Invited',
      DELETED: 'Deleted',
    },
  },
  supportStatus: {
    'bn-BD': {
      OPEN: 'খোলা',
      IN_PROGRESS: 'চলমান',
      WAITING_FOR_SUPPORT: 'সাপোর্টের অপেক্ষায়',
      WAITING_FOR_USER: 'ব্যবহারকারীর উত্তরের অপেক্ষায়',
      RESOLVED: 'সমাধান হয়েছে',
      CLOSED: 'বন্ধ',
    },
    'en-US': {
      OPEN: 'Open',
      IN_PROGRESS: 'In progress',
      WAITING_FOR_SUPPORT: 'Waiting for support',
      WAITING_FOR_USER: 'Waiting for user',
      RESOLVED: 'Resolved',
      CLOSED: 'Closed',
    },
  },
  supportPriority: {
    'bn-BD': {
      LOW: 'কম',
      NORMAL: 'স্বাভাবিক',
      HIGH: 'উচ্চ',
      URGENT: 'জরুরি',
    },
    'en-US': {
      LOW: 'Low',
      NORMAL: 'Normal',
      HIGH: 'High',
      URGENT: 'Urgent',
    },
  },
  supportCategory: {
    'bn-BD': {
      GENERAL: 'সাধারণ',
      BILLING: 'বিলিং',
      BUG_REPORT: 'বাগ রিপোর্ট',
      FEATURE_REQUEST: 'ফিচার অনুরোধ',
      ACCOUNT_ISSUE: 'অ্যাকাউন্ট সমস্যা',
    },
    'en-US': {
      GENERAL: 'General',
      BILLING: 'Billing',
      BUG_REPORT: 'Bug report',
      FEATURE_REQUEST: 'Feature request',
      ACCOUNT_ISSUE: 'Account issue',
    },
  },
  investmentStatus: {
    'bn-BD': {
      ACTIVE: 'সক্রিয়',
      MATURED: 'মেয়াদ পূর্ণ',
      SOLD: 'বিক্রি হয়েছে',
      CANCELLED: 'বাতিল',
    },
    'en-US': {
      ACTIVE: 'Active',
      MATURED: 'Matured',
      SOLD: 'Sold',
      CANCELLED: 'Cancelled',
    },
  },
  investmentCashflowType: {
    'bn-BD': {
      BUY: 'ক্রয়',
      ADD_FUNDS: 'ফান্ড যোগ',
      INSTALLMENT: 'কিস্তি',
      RETURN: 'রিটার্ন',
      SELL: 'বিক্রি',
      MATURITY: 'মেয়াদ পূর্তি',
      FEE: 'ফি',
      TAX: 'কর',
      ADJUSTMENT: 'সমন্বয়',
    },
    'en-US': {
      BUY: 'Buy',
      ADD_FUNDS: 'Add funds',
      INSTALLMENT: 'Installment',
      RETURN: 'Return',
      SELL: 'Sell',
      MATURITY: 'Maturity',
      FEE: 'Fee',
      TAX: 'Tax',
      ADJUSTMENT: 'Adjustment',
    },
  },
} as const;

type LabelGroup = keyof typeof LOCALIZED_LABELS;

export function getLocalizedLabel(group: LabelGroup, value: string | null | undefined, locale?: string | null) {
  if (!value) return '';
  const activeLocale = getActiveLocale(locale);
  const labels = LOCALIZED_LABELS[group][activeLocale] as Record<string, string>;
  return labels[value] || value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getAccountTypeLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('accountType', value, locale);
}

export function getFrequencyLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('frequency', value, locale);
}

export function getTransactionTypeLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('transactionType', value, locale);
}

export function getSupportStatusLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('supportStatus', value, locale);
}

export function getSupportPriorityLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('supportPriority', value, locale);
}

export function getSupportCategoryLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('supportCategory', value, locale);
}

export function getInvestmentStatusLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('investmentStatus', value, locale);
}

export function getInvestmentCashflowTypeLabel(value: string, locale?: string | null) {
  return getLocalizedLabel('investmentCashflowType', value, locale);
}
