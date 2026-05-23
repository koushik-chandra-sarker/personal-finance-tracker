import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Goal,
  Landmark,
  LockKeyhole,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import PublicNav from '@/components/public/PublicNav';
import { auth } from '@/lib/auth';
import { getRequestLocale } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();

  if (locale === 'bn-BD') {
    return {
      title: 'TakaPilot - ব্যক্তিগত অর্থ ব্যবস্থাপক',
      description: 'আয়-খরচ, বাজেট, লক্ষ্য, বিল, বেতন, আয়কর এবং বিনিয়োগ এক জায়গায় পরিচালনার অ্যাপ।',
    };
  }

  return {
    title: 'TakaPilot - Personal Finance Manager',
    description: 'Track income, expenses, budgets, savings goals, bills, cash flow, salary, tax, and investments in one personal finance app.',
  };
}

const landingCopy = {
  'bn-BD': {
    nav: { guide: 'গাইড', login: 'লগইন', register: 'রেজিস্টার', dashboard: 'ড্যাশবোর্ড', tagline: 'ব্যক্তিগত অর্থ ব্যবস্থাপক' },
    heroEyebrow: 'বাংলা-প্রথম অর্থ ব্যবস্থাপনা',
    heroTitle: 'TakaPilot',
    heroSubtitle: 'আপনার টাকা বুঝুন, নিয়ন্ত্রণ করুন, পরিকল্পনা করুন।',
    heroText: 'আয়-খরচ, বাজেট, সঞ্চয় লক্ষ্য, বিল, বেতন, আয়কর, বিনিয়োগ এবং পেমেন্ট অনুমোদন এক জায়গায়। যেন মাস শেষে বেতন কোথায় গেল, সেটা আর অনুমান করতে না হয়।',
    primaryCta: 'ফ্রি ট্রায়াল শুরু করুন',
    dashboardCta: 'ড্যাশবোর্ডে যান',
    secondaryCta: 'ডেমো দেখুন',
    guideCta: 'ব্যবহার গাইড',
    scene: {
      title: 'মে মাসের সারাংশ',
      balance: 'মোট ব্যালেন্স',
      balanceValue: '৳ ৪,৮২,৫০০',
      trend: '+১২.৪% এই মাসে',
      income: 'আয়',
      incomeValue: '৳১.২৫ লাখ',
      expense: 'খরচ',
      expenseValue: '৳৭২ হাজার',
      budget: 'বাজেট ব্যবহার',
      budgetValue: '৬৮%',
      tax: 'আয়কর প্রস্তুতি',
      taxValue: '৳ ১৯,৫০৮',
      goal: 'সঞ্চয় লক্ষ্য',
      notification: 'বিদ্যুৎ বিল কাল দিতে হবে',
      recent: 'সাম্প্রতিক লেনদেন',
      recentRows: [
        ['বেতন জমা হয়েছে', '+৳৭৫,০০০'],
        ['বাসা ভাড়া পরিশোধ', '-৳২২,০০০'],
        ['ডিপিএস কিস্তি', '-৳৫,০০০'],
      ],
    },
    proof: [
      ['বিডিটি', 'ডিফল্ট মুদ্রা'],
      ['বাংলা ও ইংরেজি', 'দুই ভাষায় ব্যবহারযোগ্য'],
      ['বিকাশ/নগদ', 'হাতে যাচাই করা পেমেন্ট'],
    ],
    problemEyebrow: 'সমস্যা',
    problemTitle: 'মাসে আয় হয়, কিন্তু টাকা কোথায় যায় বোঝা কঠিন।',
    problemText: 'নোটবুক এলোমেলো, এক্সেল সময় নেয়, আর বিল-সঞ্চয়-বাজেট মনে রাখা কঠিন। TakaPilot এই দৈনন্দিন চাপগুলো এক জায়গায় গুছিয়ে দেয়।',
    problems: [
      'প্রতিদিনের খরচ ঠিকভাবে লেখা হয় না',
      'বিল ও সাবস্ক্রিপশনের তারিখ ভুলে যায়',
      'কত টাকা সঞ্চয় করা যাবে পরিষ্কার থাকে না',
      'কোন খাতে বেশি খরচ হচ্ছে বোঝা কঠিন',
      'বাজেট ছাড়িয়ে গেলে আগে থেকে সতর্কতা নেই',
    ],
    solutionEyebrow: 'সমাধান',
    solutionTitle: 'বাস্তব জীবনের ব্যক্তিগত অর্থ ব্যবস্থাপনা সহজ করুন।',
    solutionText: 'হিসাব রাখা, বোঝা, পরিকল্পনা করা এবং সময়মতো সতর্কতা পাওয়ার জন্য TakaPilot একটি সহজ কিন্তু পূর্ণাঙ্গ ওয়ার্কস্পেস।',
    benefits: [
      ['সব হিসাব এক জায়গায়', 'আয়, খরচ, ট্রান্সফার, বিল, সঞ্চয় এবং বিনিয়োগ।'],
      ['খরচ বুঝুন', 'খাতভিত্তিক রিপোর্ট ও মাসিক ট্রেন্ডে টাকা কোথায় যাচ্ছে দেখুন।'],
      ['ভালো পরিকল্পনা করুন', 'বাজেট, জরুরি তহবিল, লক্ষ্য এবং ভবিষ্যৎ নগদ প্রবাহ।'],
      ['সময়মতো সতর্কতা', 'বিল, বাজেট সীমা, পেমেন্ট অনুমোদন ও গুরুত্বপূর্ণ বার্তা।'],
    ],
    featuresEyebrow: 'মূল ফিচার',
    featuresTitle: 'আপনার টাকার প্রতিটি গুরুত্বপূর্ণ অংশের জন্য টুল।',
    features: [
      ['স্মার্ট ড্যাশবোর্ড', 'ব্যালেন্স, নগদ প্রবাহ, আয়, খরচ ও সঞ্চয়ের সারাংশ।'],
      ['খরচ ট্র্যাকিং', 'খাত ও অ্যাকাউন্ট অনুযায়ী প্রতিদিনের খরচ লিখুন।'],
      ['বাজেট ব্যবস্থাপনা', 'মাসিক বাজেট সেট করুন এবং সীমার আগে সতর্কতা পান।'],
      ['সঞ্চয় লক্ষ্য', 'জরুরি তহবিল, ভ্রমণ, গ্যাজেট বা যেকোনো লক্ষ্য ট্র্যাক করুন।'],
      ['বিল রিমাইন্ডার', 'ভাড়া, ঋণ, বিদ্যুৎ, ইন্টারনেট বা সাবস্ক্রিপশন ভুলবেন না।'],
      ['রিপোর্ট ও ইনসাইট', 'চার্ট ও সারাংশে খরচের ধরন বুঝুন।'],
      ['ইমপোর্ট ও এক্সপোর্ট', 'পুরনো রেকর্ড থেকে CSV/Excel ডেটা আনুন বা ব্যাকআপ নিন।'],
      ['নিরাপদ ব্যক্তিগত ডেটা', 'লগইন, প্রাইভেট রেকর্ড, ব্যাকআপ এবং এক্সপোর্ট নিয়ন্ত্রণ।'],
    ],
    howEyebrow: 'কীভাবে কাজ করে',
    howTitle: 'তিন ধাপে শুরু করুন',
    how: [
      ['১', 'অ্যাকাউন্ট যোগ করুন', 'ক্যাশ, ব্যাংক, মোবাইল ওয়ালেট, কার্ড বা সঞ্চয় অ্যাকাউন্ট।'],
      ['২', 'লেনদেন লিখুন', 'আয়, খরচ, ট্রান্সফার, বিল এবং সঞ্চয়ের অগ্রগতি যোগ করুন।'],
      ['৩', 'ইনসাইট দেখুন', 'খরচ, বাজেট, লক্ষ্য এবং ভবিষ্যৎ নগদ প্রবাহ বুঝুন।'],
    ],
    previewEyebrow: 'অ্যাপ প্রিভিউ',
    previewTitle: 'ড্যাশবোর্ড থেকে আয়কর পর্যন্ত একই অভিজ্ঞতা।',
    previews: [
      ['ড্যাশবোর্ড', 'আয় বনাম খরচ, ব্যালেন্স, বাজেট এবং লক্ষ্য।'],
      ['লেনদেন', 'দ্রুত আয়-খরচ লেখা, খাত ও অ্যাকাউন্ট নির্বাচন।'],
      ['বাজেট', 'মাসিক সীমা, সতর্কতা এবং ব্যবহার অগ্রগতি।'],
      ['লক্ষ্য', 'সঞ্চয়ের লক্ষ্য, জমা, উত্তোলন এবং ইতিহাস।'],
      ['রিপোর্ট', 'খরচের খাত, ট্রেন্ড এবং নগদ প্রবাহ।'],
      ['বিল ক্যালেন্ডার', 'দেয় তারিখ, পুনরাবৃত্ত বিল এবং রিমাইন্ডার।'],
    ],
    valueEyebrow: 'বাস্তব লাভ',
    valueTitle: 'শুধু ফিচার নয়, সিদ্ধান্ত নেওয়ার আত্মবিশ্বাস।',
    valueRows: [
      ['বাজেট ট্র্যাকিং', 'কত টাকা খরচ করতে পারবেন জানুন'],
      ['লক্ষ্য ট্র্যাকিং', 'পরিষ্কার লক্ষ্য নিয়ে টাকা জমাতে থাকুন'],
      ['খরচ রিপোর্ট', 'অপ্রয়োজনীয় খরচ দ্রুত খুঁজে বের করুন'],
      ['বিল রিমাইন্ডার', 'দেরি ফি ও ভুলে যাওয়া কমান'],
      ['নগদ প্রবাহ', 'টাকা শেষ হওয়ার আগে পরিকল্পনা করুন'],
    ],
    usersEyebrow: 'কার জন্য',
    usersTitle: 'চাকরিজীবী, ফ্রিল্যান্সার, শিক্ষার্থী, পরিবার এবং ব্যক্তিগত বাজেট ব্যবহারকারীদের জন্য।',
    trustText: 'বাংলাদেশের বাস্তব টাকা ব্যবস্থাপনার অভ্যাস মাথায় রেখে ডিজাইন করা।',
    quote: '“এখন আমি মাস শেষে ঠিক বুঝতে পারি আমার বেতন কোথায় গেল।”',
    pricingEyebrow: 'প্ল্যান',
    pricingTitle: 'ট্রায়াল দিয়ে শুরু করুন, প্রয়োজন হলে আপগ্রেড করুন।',
    plans: [
      {
        name: 'ট্রায়াল',
        description: 'প্রথমবারের ব্যবহারকারীর জন্য',
        price: '৳০',
        items: ['বেসিক আয়-খরচ ট্র্যাকিং', 'সীমিত অ্যাকাউন্ট', 'মাসিক সারাংশ', 'বেসিক বাজেট'],
        action: 'ট্রায়াল শুরু করুন',
      },
      {
        name: 'প্রিমিয়াম',
        description: 'সম্পূর্ণ অর্থ ব্যবস্থাপনা',
        price: 'অ্যাডমিন নির্ধারিত',
        items: ['আনলিমিটেড অ্যাকাউন্ট', 'অ্যাডভান্স রিপোর্ট', 'লক্ষ্য ও বিল রিমাইন্ডার', 'Excel ইমপোর্ট/এক্সপোর্ট', 'বেতন ও আয়কর ক্যালকুলেটর'],
        action: 'প্যাকেজ নির্বাচন করুন',
      },
    ],
    securityEyebrow: 'নিরাপত্তা ও প্রাইভেসি',
    securityTitle: 'আপনার আর্থিক তথ্য আপনার নিয়ন্ত্রণে থাকে।',
    securityText: 'আমরা আপনার ব্যক্তিগত আর্থিক রেকর্ড পাবলিক করি না বা বিক্রি করি না। লগইন, ব্যাকআপ, এক্সপোর্ট এবং অ্যাকাউন্ট ডিলিট করার নিয়ন্ত্রণ আপনার হাতে।',
    securityPoints: ['নিরাপদ লগইন', 'প্রাইভেট আর্থিক রেকর্ড', 'ব্যাকআপ ও এক্সপোর্ট', 'ডেটা পরিষ্কার বা অ্যাকাউন্ট ডিলিট অপশন'],
    faqEyebrow: 'প্রশ্নোত্তর',
    faqTitle: 'শুরু করার আগে সাধারণ প্রশ্ন',
    faqs: [
      ['এটা কি ফ্রি?', 'প্রথমবারের ব্যবহারকারী ট্রায়াল প্যাকেজ নিতে পারেন। পরে প্রয়োজন হলে পেইড প্যাকেজে আপগ্রেড করা যায়।'],
      ['বিকাশ, নগদ, ক্যাশ বা ব্যাংক ট্র্যাক করা যাবে?', 'হ্যাঁ। আপনি আলাদা অ্যাকাউন্ট তৈরি করে ম্যানুয়ালি টাকা ট্র্যাক করতে পারবেন।'],
      ['Excel ডেটা ইমপোর্ট করা যাবে?', 'হ্যাঁ, আপনার প্যাকেজে ইমপোর্ট/এক্সপোর্ট থাকলে পুরনো রেকর্ড ব্যবহার করতে পারবেন।'],
      ['আমার ডেটা কি নিরাপদ?', 'আপনার রেকর্ড প্রাইভেট থাকে এবং আপনি ব্যাকআপ, এক্সপোর্ট বা ডিলিটের নিয়ন্ত্রণ পান।'],
      ['পরিবারের বাজেট করা যাবে?', 'হ্যাঁ। household income, expense, bill এবং goal একসাথে ম্যানেজ করা যায়।'],
    ],
    finalTitle: 'আজ থেকেই নিজের টাকার ওপর পরিষ্কার নিয়ন্ত্রণ নিন।',
    finalText: 'TakaPilot দিয়ে বেতন, খরচ, বাজেট, বিল ও সঞ্চয় এক জায়গায় বুঝে পরিকল্পনা করুন।',
  },
  'en-US': {
    nav: { guide: 'Guide', login: 'Login', register: 'Register', dashboard: 'Dashboard', tagline: 'Personal Finance Manager' },
    heroEyebrow: 'Bangla-first personal finance',
    heroTitle: 'TakaPilot',
    heroSubtitle: 'Understand, control, and plan your money.',
    heroText: 'Track income, expenses, budgets, savings goals, bills, salary, tax, investments, and payment approval in one simple app, so your salary never disappears without explanation.',
    primaryCta: 'Start free trial',
    dashboardCta: 'Go to dashboard',
    secondaryCta: 'View demo',
    guideCta: 'User guide',
    scene: {
      title: 'May overview',
      balance: 'Total balance',
      balanceValue: '৳ 4,82,500',
      trend: '+12.4% this month',
      income: 'Income',
      incomeValue: '৳1.25L',
      expense: 'Expense',
      expenseValue: '৳72K',
      budget: 'Budget usage',
      budgetValue: '68%',
      tax: 'Tax ready',
      taxValue: '৳ 19,508',
      goal: 'Savings goal',
      notification: 'Electricity bill due tomorrow',
      recent: 'Recent transactions',
      recentRows: [
        ['Salary credited', '+৳75,000'],
        ['Rent paid', '-৳22,000'],
        ['DPS installment', '-৳5,000'],
      ],
    },
    proof: [
      ['BDT', 'Default currency'],
      ['Bangla + English', 'Works in both languages'],
      ['bKash/Nagad', 'Manual payment verification'],
    ],
    problemEyebrow: 'Problem',
    problemTitle: 'You earn every month, but it is hard to see where the money goes.',
    problemText: 'Notebooks become messy, Excel takes time, and remembering bills, savings, and budgets is difficult. TakaPilot brings those daily decisions into one organized place.',
    problems: [
      'Daily spending is not tracked properly',
      'Bills and subscription due dates are forgotten',
      'Monthly savings plans are unclear',
      'Spending patterns are hard to understand',
      'Budget limits are missed before you notice',
    ],
    solutionEyebrow: 'Solution',
    solutionTitle: 'Make real-life personal finance easier to manage.',
    solutionText: 'TakaPilot gives you a simple but complete workspace for recording money, understanding habits, planning ahead, and staying alert.',
    benefits: [
      ['Track everything', 'Income, expense, transfers, bills, savings, and investments.'],
      ['Understand spending', 'See category-wise reports and monthly trends.'],
      ['Plan better', 'Create budgets, emergency funds, goals, and cash-flow plans.'],
      ['Stay alert', 'Get reminders for bills, budget limits, approvals, and admin messages.'],
    ],
    featuresEyebrow: 'Key features',
    featuresTitle: 'Tools for every important part of your money.',
    features: [
      ['Smart dashboard', 'View balance, cash flow, income, expense, and savings overview.'],
      ['Expense tracking', 'Record daily spending by category and account.'],
      ['Budget management', 'Set monthly budgets and get warnings before overspending.'],
      ['Savings goals', 'Track emergency fund, travel fund, gadget fund, or any personal goal.'],
      ['Bill reminder', 'Never miss rent, loan, electricity, internet, or subscriptions.'],
      ['Reports & insights', 'Understand where your money goes with charts and summaries.'],
      ['CSV/Excel import', 'Bring existing records in and export backups when needed.'],
      ['Secure personal data', 'Keep financial records private, organized, and exportable.'],
    ],
    howEyebrow: 'How it works',
    howTitle: 'Start in three steps',
    how: [
      ['1', 'Add accounts', 'Cash, bank, mobile wallet, card, or savings account.'],
      ['2', 'Record transactions', 'Add income, expenses, transfers, bills, and savings progress.'],
      ['3', 'See insights', 'Understand spending, budget, goals, and future cash flow.'],
    ],
    previewEyebrow: 'App preview',
    previewTitle: 'One experience from dashboard to tax planning.',
    previews: [
      ['Dashboard', 'Income vs expense, balance, budgets, and goals.'],
      ['Transactions', 'Fast income and expense entry with account/category selection.'],
      ['Budget', 'Monthly limits, warnings, and usage progress.'],
      ['Goals', 'Savings targets, deposits, withdrawals, and history.'],
      ['Reports', 'Category spending, trends, and cash-flow summaries.'],
      ['Bill calendar', 'Due dates, recurring bills, and reminders.'],
    ],
    valueEyebrow: 'Real benefits',
    valueTitle: 'Not just features, but confidence for daily decisions.',
    valueRows: [
      ['Budget tracking', 'Know how much you can spend'],
      ['Goal tracking', 'Save money with a clear target'],
      ['Expense reports', 'Find unnecessary spending'],
      ['Bill reminders', 'Avoid late fees'],
      ['Cash-flow view', 'Plan before money runs out'],
    ],
    usersEyebrow: 'Who it is for',
    usersTitle: 'Built for salaried people, freelancers, students, small families, and anyone who wants better money control.',
    trustText: 'Designed for real-life Bangladeshi money management habits.',
    quote: '“Now I know exactly where my salary goes every month.”',
    pricingEyebrow: 'Pricing',
    pricingTitle: 'Start with trial access and upgrade when you are ready.',
    plans: [
      {
        name: 'Trial',
        description: 'For first-time users',
        price: '৳0',
        items: ['Basic income/expense tracking', 'Limited accounts', 'Monthly summary', 'Basic budget'],
        action: 'Start trial',
      },
      {
        name: 'Premium',
        description: 'Full personal finance workspace',
        price: 'Admin configured',
        items: ['Unlimited accounts', 'Advanced reports', 'Goal and bill reminders', 'Excel import/export', 'Salary and tax calculator'],
        action: 'Choose package',
      },
    ],
    securityEyebrow: 'Security & privacy',
    securityTitle: 'Your financial data stays under your control.',
    securityText: 'Your records are private. We do not sell your financial data. You control login, backup, export, clear-data, and account deletion options.',
    securityPoints: ['Secure login', 'Private financial records', 'Backup and export', 'Clear data or delete account option'],
    faqEyebrow: 'FAQ',
    faqTitle: 'Common questions before getting started',
    faqs: [
      ['Is this app free?', 'First-time users can start with a trial package. You can upgrade to a paid package when needed.'],
      ['Can I track bKash, Nagad, cash, and bank accounts?', 'Yes. You can create different accounts and track each one manually.'],
      ['Can I import Excel data?', 'Yes, if your selected package supports import/export.'],
      ['Is my data safe?', 'Your records stay private, and you control backup, export, and deletion options.'],
      ['Can I use it for family budgeting?', 'Yes. You can manage household income, expenses, bills, and goals together.'],
    ],
    finalTitle: 'Start managing your money smarter today.',
    finalText: 'Use TakaPilot to understand salary, spending, budgets, bills, and savings in one place.',
  },
};

const solutionIcons = [Wallet, BarChart3, Goal, Bell];
const featureIcons = [BarChart3, ReceiptText, CreditCard, Goal, CalendarCheck, PiggyBank, FileSpreadsheet, ShieldCheck];
const previewIcons = [Landmark, ReceiptText, CreditCard, Goal, BarChart3, Bell];

export default async function Home() {
  const [session, locale] = await Promise.all([auth(), getRequestLocale()]);
  const copy = landingCopy[locale];
  const isAuthenticated = Boolean(session?.user);
  const primaryHref = isAuthenticated
    ? session?.user?.mustChangePassword
      ? '/change-password'
      : session?.user?.onboardingCompletedAt === null
        ? '/onboarding'
        : '/dashboard'
    : '/register';

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate overflow-hidden bg-[#eef7f1]">
        <FinanceScene copy={copy.scene} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,252,0.98)_0%,rgba(248,250,252,0.93)_42%,rgba(248,250,252,0.36)_72%,rgba(248,250,252,0.12)_100%)]" />

        <div className="relative z-20">
          <PublicNav active="home" isAuthenticated={isAuthenticated} locale={locale} labels={copy.nav} />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(92svh-5rem)] max-w-6xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl py-5 lg:py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1.5 text-sm font-black text-emerald-800 shadow-sm backdrop-blur">
              <Banknote className="h-4 w-4" />
              {copy.heroEyebrow}
            </div>

            <h1 className="mt-6 text-6xl font-black leading-none text-slate-950 sm:text-7xl lg:text-8xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
              {copy.heroSubtitle}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {copy.heroText}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={primaryHref} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800">
                {isAuthenticated ? copy.dashboardCta : copy.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#app-preview" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/85 px-5 py-3 text-sm font-black text-slate-800 shadow-sm backdrop-blur transition hover:bg-white">
                {copy.secondaryCta}
              </Link>
              <Link href="/guide" className="inline-flex items-center gap-2 rounded-xl border border-transparent px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-white/70">
                {copy.guideCta}
              </Link>
            </div>
          </div>

          <div className="mt-auto grid gap-3 pb-4 sm:grid-cols-3 lg:max-w-3xl">
            {copy.proof.map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-lg font-black text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <SectionIntro eyebrow={copy.problemEyebrow} title={copy.problemTitle} text={copy.problemText} />
          <div className="grid gap-3 sm:grid-cols-2">
            {copy.problems.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-bold leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionIntro eyebrow={copy.solutionEyebrow} title={copy.solutionTitle} text={copy.solutionText} centered />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.benefits.map(([title, text], index) => {
              const Icon = solutionIcons[index] || CheckCircle2;
              return (
                <FeatureCard key={title} icon={Icon} title={title} text={text} />
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionIntro eyebrow={copy.featuresEyebrow} title={copy.featuresTitle} centered />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.features.map(([title, text], index) => {
              const Icon = featureIcons[index] || BadgeCheck;
              return (
                <FeatureCard key={title} icon={Icon} title={title} text={text} compact />
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionIntro eyebrow={copy.howEyebrow} title={copy.howTitle} dark centered />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.how.map(([number, title, text]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">{number}</span>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="app-preview" className="bg-[#eef7f1] py-14 scroll-mt-8">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <SectionIntro eyebrow={copy.previewEyebrow} title={copy.previewTitle} />
          <div className="grid gap-4 sm:grid-cols-2">
            {copy.previews.map(([title, text], index) => {
              const Icon = previewIcons[index] || Sparkles;
              return (
                <div key={title} className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="h-2 w-16 rounded-full bg-slate-100" />
                  </div>
                  <h3 className="mt-5 font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  <div className="mt-5 space-y-2">
                    <span className="block h-2 rounded-full bg-slate-100" />
                    <span className="block h-2 w-2/3 rounded-full bg-slate-100" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <SectionIntro eyebrow={copy.valueEyebrow} title={copy.valueTitle} />
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {copy.valueRows.map(([feature, benefit]) => (
              <div key={feature} className="grid gap-2 border-b border-slate-200 p-4 last:border-b-0 sm:grid-cols-[0.8fr_1.2fr]">
                <p className="text-sm font-black text-slate-950">{feature}</p>
                <p className="text-sm font-semibold leading-6 text-slate-600">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#f8fafc] py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-wide text-indigo-700">{copy.usersEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950">{copy.usersTitle}</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <p className="mt-5 text-sm font-bold leading-6 text-slate-300">{copy.trustText}</p>
            <p className="mt-6 text-2xl font-black leading-tight">{copy.quote}</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionIntro eyebrow={copy.pricingEyebrow} title={copy.pricingTitle} centered />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {copy.plans.map((plan, index) => (
              <div key={plan.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950">{plan.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{plan.description}</p>
                  </div>
                  <p className="text-xl font-black text-slate-950">{plan.price}</p>
                </div>
                <ul className="mt-6 grid gap-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={index === 0 ? primaryHref : '/subscription'} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                  {plan.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="rounded-2xl bg-slate-950 p-6 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-wide text-emerald-300">{copy.securityEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">{copy.securityTitle}</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">{copy.securityText}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {copy.securityPoints.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <p className="mt-4 text-sm font-black leading-6 text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionIntro eyebrow={copy.faqEyebrow} title={copy.faqTitle} centered />
          <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {copy.faqs.map(([question, answer]) => (
              <div key={question} className="p-5">
                <h3 className="font-black text-slate-950">{question}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-black leading-tight">{copy.finalTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">{copy.finalText}</p>
          </div>
          <Link href={primaryHref} className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100">
            {isAuthenticated ? copy.dashboardCta : copy.primaryCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function SectionIntro({
  eyebrow,
  title,
  text,
  centered = false,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  centered?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : undefined}>
      <p className={dark ? 'text-xs font-black uppercase tracking-wide text-emerald-300' : 'text-xs font-black uppercase tracking-wide text-emerald-700'}>{eyebrow}</p>
      <h2 className={dark ? 'mt-3 text-3xl font-black leading-tight text-white sm:text-4xl' : 'mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl'}>{title}</h2>
      {text ? (
        <p className={dark ? 'mt-4 text-base font-semibold leading-7 text-slate-300' : 'mt-4 text-base leading-7 text-slate-600'}>{text}</p>
      ) : null}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  compact = false,
}: {
  icon: typeof Wallet;
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className={compact ? 'mt-4 font-black text-slate-950' : 'mt-5 text-lg font-black text-slate-950'}>{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function FinanceScene({ copy }: { copy: (typeof landingCopy)['bn-BD']['scene'] }) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute right-[-10rem] top-[7rem] hidden w-[60rem] rotate-[-4deg] lg:block">
        <ProductWindow copy={copy} />
      </div>
      <div className="absolute bottom-[-3rem] left-4 right-4 block sm:left-auto sm:right-6 sm:w-[28rem] lg:hidden">
        <ProductWindow copy={copy} compact />
      </div>
    </div>
  );
}

function ProductWindow({ copy, compact = false }: { copy: (typeof landingCopy)['bn-BD']['scene']; compact?: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/20">
      <div className="rounded-[1.1rem] border border-slate-200 bg-[#f8fafc] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{copy.title}</p>
            <p className={compact ? 'mt-1 text-2xl font-black text-slate-950' : 'mt-2 text-4xl font-black text-slate-950'}>{copy.balanceValue}</p>
            <p className="mt-1 text-xs font-bold text-emerald-600">{copy.trend}</p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Wallet className="h-6 w-6" />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            [copy.income, copy.incomeValue, 'bg-emerald-50 text-emerald-700'],
            [copy.expense, copy.expenseValue, 'bg-rose-50 text-rose-700'],
            [copy.budget, copy.budgetValue, 'bg-sky-50 text-sky-700'],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
              <p className={`mt-2 text-sm font-black ${tone.split(' ')[1]}`}>{value}</p>
              <div className={`mt-3 h-1.5 rounded-full ${tone.split(' ')[0]}`} />
            </div>
          ))}
        </div>

        <div className={compact ? 'mt-4 grid gap-3' : 'mt-4 grid grid-cols-[1.12fr_0.88fr] gap-3'}>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{copy.goal}</p>
              <Goal className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-5 flex items-end gap-2">
              {[44, 72, 58, 86, 64, 80].map((height, index) => (
                <div key={index} className="flex h-24 flex-1 items-end rounded-full bg-slate-100">
                  <div className="w-full rounded-full bg-indigo-500" style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-100">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                <p className="text-xs font-black">{copy.tax}</p>
              </div>
              <p className="mt-3 text-lg font-black">{copy.taxValue}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 text-sky-600" />
                <p className="text-xs font-bold leading-5 text-slate-600">{copy.notification}</p>
              </div>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{copy.recent}</p>
              <ReceiptText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 space-y-2">
              {copy.recentRows.map(([item, amount], index) => (
                <div key={item} className="flex items-center justify-between gap-4 rounded-xl bg-white/10 px-3 py-2">
                  <span className="truncate text-xs font-bold text-slate-200">{item}</span>
                  <span className={index === 0 ? 'shrink-0 text-xs font-black text-emerald-300' : 'shrink-0 text-xs font-black text-rose-300'}>
                    {amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
