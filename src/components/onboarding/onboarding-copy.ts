import type { AppLocale } from '@/i18n/config';

export type OnboardingStep = 'language' | 'currency' | 'experience' | 'starter';

export const ONBOARDING_STEPS: OnboardingStep[] = ['language', 'currency', 'experience', 'starter'];

export const ONBOARDING_COPY: Record<AppLocale, {
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  step: string;
  continue: string;
  back: string;
  finish: string;
  saving: string;
  changeLater: string;
  summaryTitle: string;
  summary: Record<'language' | 'currency' | 'experience' | 'starter', string>;
  steps: Record<OnboardingStep, { label: string; title: string; description: string; hint: string }>;
  experienceOptions: Record<'BASIC' | 'FULL', string>;
  starterOptions: Record<'starter' | 'blank', { title: string; description: string; summary: string }>;
}> = {
  'en-US': {
    badge: 'First setup',
    eyebrow: 'Make TakaPilot yours',
    title: 'Set up your workspace step by step.',
    subtitle: 'Choose the basics once, then TakaPilot opens with the right language, currency, and tools.',
    step: 'Step',
    continue: 'Continue',
    back: 'Back',
    finish: 'Finish setup',
    saving: 'Saving...',
    changeLater: 'You can change these later from Settings.',
    summaryTitle: 'Your setup',
    summary: { language: 'Language', currency: 'Currency', experience: 'Mode', starter: 'Workspace' },
    steps: {
      language: {
        label: 'Language',
        title: 'Choose your language',
        description: 'The next steps will instantly use the language you select here.',
        hint: 'Bangla is the default, but English is always available.',
      },
      currency: {
        label: 'Currency',
        title: 'Choose your base currency',
        description: 'Balances, reports, budgets, and entries will use this currency.',
        hint: 'For Bangladesh users, BDT is usually the best choice.',
      },
      experience: {
        label: 'Experience',
        title: 'Choose how much of the app you want',
        description: 'Start simple or unlock every planning feature from day one.',
        hint: 'Basic keeps the menu focused. Full keeps every tool visible.',
      },
      starter: {
        label: 'Starter data',
        title: 'Choose how your workspace starts',
        description: 'Use default categories or begin with a completely blank workspace.',
        hint: 'Starter setup creates categories and a Cash account. Blank creates no preconfigured finance data.',
      },
    },
    experienceOptions: {
      BASIC: 'Daily tracking with accounts, transactions, categories, budgets, reports, settings, and support.',
      FULL: 'All Basic tools plus goals, investments, salary planner, tax calculator, notes, recurring items, and subscriptions.',
    },
    starterOptions: {
      starter: {
        title: 'Use starter setup',
        description: 'Create useful default categories and a Cash account so you can start quickly.',
        summary: 'Starter setup',
      },
      blank: {
        title: 'Blank workspace',
        description: 'Start with no preconfigured finance data and build everything yourself.',
        summary: 'Blank workspace',
      },
    },
  },
  'bn-BD': {
    badge: 'প্রথম সেটআপ',
    eyebrow: 'TakaPilot আপনার মতো করে নিন',
    title: 'ধাপে ধাপে আপনার ওয়ার্কস্পেস সেট করুন।',
    subtitle: 'ভাষা, মুদ্রা এবং কাজের ধরন একবার বেছে নিলে TakaPilot সেই অনুযায়ী খুলবে।',
    step: 'ধাপ',
    continue: 'চালিয়ে যান',
    back: 'পেছনে যান',
    finish: 'সেটআপ শেষ করুন',
    saving: 'সেভ হচ্ছে...',
    changeLater: 'এগুলো পরে Settings থেকে বদলানো যাবে।',
    summaryTitle: 'আপনার সেটআপ',
    summary: { language: 'ভাষা', currency: 'মুদ্রা', experience: 'মোড', starter: 'ওয়ার্কস্পেস' },
    steps: {
      language: {
        label: 'ভাষা',
        title: 'আপনার ভাষা বেছে নিন',
        description: 'এখানে যে ভাষা নির্বাচন করবেন, পরের ধাপগুলো সাথে সাথে সেই ভাষায় দেখা যাবে।',
        hint: 'ডিফল্ট ভাষা বাংলা, তবে ইংরেজিও সবসময় ব্যবহার করা যাবে।',
      },
      currency: {
        label: 'মুদ্রা',
        title: 'বেস কারেন্সি বেছে নিন',
        description: 'ব্যালেন্স, রিপোর্ট, বাজেট এবং নতুন এন্ট্রিতে এই মুদ্রা ব্যবহার হবে।',
        hint: 'বাংলাদেশের জন্য সাধারণত BDT সবচেয়ে ভালো পছন্দ।',
      },
      experience: {
        label: 'এক্সপেরিয়েন্স',
        title: 'অ্যাপ কতটা ফিচারসহ ব্যবহার করবেন?',
        description: 'সহজভাবে শুরু করুন অথবা প্রথম দিন থেকেই সব প্ল্যানিং টুল চালু রাখুন।',
        hint: 'Basic মেনু ছোট রাখে। Full সব টুল দেখায়।',
      },
      starter: {
        label: 'স্টার্টার ডেটা',
        title: 'ওয়ার্কস্পেস কীভাবে শুরু হবে?',
        description: 'ডিফল্ট ক্যাটাগরি ব্যবহার করুন অথবা একদম খালি ওয়ার্কস্পেস থেকে শুরু করুন।',
        hint: 'Starter setup ক্যাটাগরি এবং Cash অ্যাকাউন্ট বানায়। Blank কোনো প্রি-কনফিগারড ডেটা বানায় না।',
      },
    },
    experienceOptions: {
      BASIC: 'প্রতিদিনের ট্র্যাকিং: অ্যাকাউন্ট, ট্রানজেকশন, ক্যাটাগরি, বাজেট, রিপোর্ট, সেটিংস এবং সাপোর্ট।',
      FULL: 'Basic এর সাথে গোল, ইনভেস্টমেন্ট, স্যালারি প্ল্যানার, ট্যাক্স ক্যালকুলেটর, নোট, রিকারিং এবং সাবস্ক্রিপশন।',
    },
    starterOptions: {
      starter: {
        title: 'Starter setup ব্যবহার করুন',
        description: 'দ্রুত শুরু করার জন্য দরকারি ডিফল্ট ক্যাটাগরি এবং Cash অ্যাকাউন্ট তৈরি হবে।',
        summary: 'Starter setup',
      },
      blank: {
        title: 'খালি ওয়ার্কস্পেস',
        description: 'কোনো প্রি-কনফিগারড ফাইন্যান্স ডেটা ছাড়া নিজে সব তৈরি করুন।',
        summary: 'খালি ওয়ার্কস্পেস',
      },
    },
  },
};
