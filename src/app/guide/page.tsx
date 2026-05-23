import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Calculator,
  CheckCircle2,
  CreditCard,
  FileText,
  Goal,
  HelpCircle,
  KeyRound,
  Landmark,
  Languages,
  LineChart,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Tags,
  Wallet,
} from 'lucide-react';
import PublicNav from '@/components/public/PublicNav';

export const metadata: Metadata = {
  title: 'User Guide - TakaPilot',
  description: 'Simple step-by-step user guide for TakaPilot features, billing, security, and support.',
};

const navItems = [
  { href: '#start', label: 'Start' },
  { href: '#flow', label: 'Flow' },
  { href: '#tutorials', label: 'Tutorials' },
  { href: '#billing', label: 'Billing' },
  { href: '#security', label: 'Security' },
];

const startSteps = [
  {
    title: 'Setup',
    text: 'Choose language, BDT currency, Basic or Full mode, and starter or blank data.',
    icon: BadgeCheck,
  },
  {
    title: 'Access',
    text: 'Start trial or submit manual payment details for admin approval.',
    icon: CreditCard,
  },
  {
    title: 'Track',
    text: 'Create accounts, categories, transactions, budgets, and reports.',
    icon: Wallet,
  },
  {
    title: 'Plan',
    text: 'Use goals, recurring rules, investments, salary planner, and tax calculator.',
    icon: LineChart,
  },
];

const dailyFlow = [
  { title: 'Account', text: 'Where money lives.' },
  { title: 'Category', text: 'Why money comes or goes.' },
  { title: 'Transaction', text: 'The actual money movement.' },
  { title: 'Budget', text: 'Monthly spending limit.' },
  { title: 'Report', text: 'Review and improve.' },
];

const topics = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'For new users and basic account setup.',
    guides: [
      {
        title: 'First setup',
        route: '/onboarding',
        icon: BadgeCheck,
        steps: [
          'Select language. Bangla is default, English is available.',
          'Keep currency as BDT unless the user needs another currency.',
          'Choose Basic mode for simple tracking or Full mode for all tools.',
          'Choose starter data for quick setup or blank workspace for manual setup.',
          'Finish setup and continue to subscription or dashboard.',
        ],
        tip: 'Language, currency, and mode can be changed later from Settings.',
      },
      {
        title: 'Dashboard',
        route: '/dashboard',
        icon: BarChart3,
        steps: [
          'Open Dashboard after login.',
          'Select month and year if available.',
          'Review balance, income, expense, savings, and budget usage.',
          'Check recent transactions and upcoming reminders.',
          'Open a widget when deeper detail is needed.',
        ],
        tip: 'Use Dashboard for quick review, not heavy editing.',
      },
      {
        title: 'Settings',
        route: '/settings',
        icon: Languages,
        steps: [
          'Open Settings from the menu.',
          'Update profile and preferences.',
          'Change theme, language, currency, or Basic/Full mode.',
          'Review billing and subscription status.',
          'Use security options for PIN, password, data reset, or account deletion.',
        ],
        tip: 'Clear data removes workspace data, not login or payment history.',
      },
    ],
  },
  {
    id: 'daily-tracking',
    title: 'Daily Money Tracking',
    description: 'The normal flow for tracking personal finance.',
    guides: [
      {
        title: 'Accounts',
        route: '/accounts',
        icon: Wallet,
        steps: [
          'Open Accounts.',
          'Click Add Account.',
          'Enter name, type, opening balance, color, and icon.',
          'Save the account.',
          'Edit account details later if needed.',
        ],
        tip: 'Create accounts first so transactions can update balances correctly.',
      },
      {
        title: 'Categories',
        route: '/categories',
        icon: Tags,
        steps: [
          'Open Categories.',
          'Choose Income or Expense.',
          'Click Add Category.',
          'Enter name, color, and icon.',
          'Save and use it in transactions and budgets.',
        ],
        tip: 'Simple category names make reports easier to read.',
      },
      {
        title: 'Transactions',
        route: '/transactions',
        icon: ReceiptText,
        steps: [
          'Open Transactions.',
          'Click Add Transaction.',
          'Choose Income or Expense.',
          'Enter amount, account, category, date, note, and tags.',
          'Save the transaction.',
          'Use filters to find or edit old transactions.',
        ],
        tip: 'Transactions feed balances, dashboard, budgets, and reports.',
      },
      {
        title: 'Budgets',
        route: '/budgets',
        icon: PiggyBank,
        steps: [
          'Open Budgets.',
          'Click Add Budget.',
          'Select an expense category.',
          'Enter the monthly budget amount.',
          'Save and monitor usage during the month.',
        ],
        tip: 'Budgets work best after categories and transactions are consistent.',
      },
      {
        title: 'Reports',
        route: '/reports',
        icon: LineChart,
        steps: [
          'Open Reports.',
          'Choose the reporting period.',
          'Review income, expense, and category trends.',
          'Compare report results with budgets.',
          'Use the insight to adjust spending.',
        ],
        tip: 'Reports become stronger after regular transaction entry.',
      },
    ],
  },
  {
    id: 'planning',
    title: 'Planning And Automation',
    description: 'For future savings, repeated bills, and personal records.',
    guides: [
      {
        title: 'Goals',
        route: '/goals',
        icon: Goal,
        steps: [
          'Open Goals.',
          'Click Add Goal.',
          'Enter name, target amount, deadline, and color.',
          'Save the goal.',
          'Use Add Funds or Take Out to move money.',
          'Review progress and history.',
        ],
        tip: 'Goal funding creates real money movement, so choose the correct account.',
      },
      {
        title: 'Recurring transactions',
        route: '/recurring',
        icon: RefreshCw,
        steps: [
          'Open Recurring.',
          'Click Add Recurring.',
          'Choose income or expense.',
          'Enter amount, account, category, frequency, and start date.',
          'Save the rule.',
          'Pause or edit it when schedules change.',
        ],
        tip: 'Use this for salary, rent, bills, and predictable payments.',
      },
      {
        title: 'Service Tracker',
        route: '/service-tracker',
        icon: CreditCard,
        steps: [
          'Open Subscription Tracker.',
          'Click Add Service.',
          'Enter provider, plan, amount, billing cycle, and next billing date.',
          'Add account and category if auto-payment should create a transaction.',
          'Save and review upcoming bills.',
        ],
        tip: 'This is for personal services, not the TakaPilot app subscription.',
      },
      {
        title: 'Notes',
        route: '/notes',
        icon: FileText,
        steps: [
          'Open Notes.',
          'Click Add Note.',
          'Choose simple or extended mode.',
          'Enter title, details, person, amount, asset, or return date.',
          'Save the note.',
          'Update status when it is returned, closed, or cancelled.',
        ],
        tip: 'Use notes for loans, receivables, handovers, and commitments.',
      },
    ],
  },
  {
    id: 'advanced-tools',
    title: 'Advanced Finance Tools',
    description: 'For investment, salary, and Bangladesh tax planning.',
    guides: [
      {
        title: 'Investments',
        route: '/investments',
        icon: Landmark,
        steps: [
          'Open Investments.',
          'Create investment type settings if needed.',
          'Click Add Investment.',
          'Enter name, type, amount, account, dates, and return settings.',
          'Save the investment.',
          'Record returns, cashflows, valuations, or maturity changes later.',
        ],
        tip: 'Use types to organize DPS, FDR, Sanchayapatra, and custom investments.',
      },
      {
        title: 'Salary Planner',
        route: '/salary-planner',
        icon: Calculator,
        steps: [
          'Open Salary Planner.',
          'Enter gross salary and salary component settings.',
          'Enable month-wise variation if salary changes during the year.',
          'Enter deductions and PF settings.',
          'Review breakdown, taxable income, rebate, and estimated tax.',
          'Adjust values until the projection matches payroll.',
        ],
        tip: 'Use month-wise variation for increment, bonus, and changing tax deductions.',
      },
      {
        title: 'Tax Calculator',
        route: '/tax-calculator',
        icon: FileText,
        steps: [
          'Open Tax Calculator.',
          'Enter yearly income heads and exemptions.',
          'Review taxable and non-taxable amounts.',
          'Check the slab calculation.',
          'Enter eligible investment amount for rebate if applicable.',
          'Review final tax liability.',
        ],
        tip: 'House rent, medical, and conveyance can be non-taxable depending on rules and limits.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Notifications And Support',
    description: 'For reminders, browser alerts, and help from admin.',
    guides: [
      {
        title: 'Notifications',
        route: 'Topbar bell',
        icon: Bell,
        steps: [
          'Click the bell icon in the topbar.',
          'Review unread notifications.',
          'Open action links when available.',
          'Mark notifications as read.',
          'Allow browser notifications when prompted.',
        ],
        tip: 'Browser notifications need browser permission and service worker support.',
      },
      {
        title: 'Support',
        route: '/support',
        icon: HelpCircle,
        steps: [
          'Open Support.',
          'Create a ticket with category, priority, subject, and message.',
          'Open the ticket to continue conversation.',
          'Generate support PIN only when admin needs read-only access.',
          'Share the PIN and revoke it when support is finished.',
        ],
        tip: 'Support PIN is temporary and does not allow editing.',
      },
    ],
  },
];

const securityItems = [
  {
    title: 'App PIN',
    text: 'Create a private PIN for finance pages. You can also choose Remind me in 7 days.',
    icon: KeyRound,
  },
  {
    title: 'Support PIN',
    text: 'Generate only when admin support needs temporary read-only troubleshooting access.',
    icon: HelpCircle,
  },
  {
    title: 'Browser notifications',
    text: 'Allow the browser permission to receive reminders and admin messages.',
    icon: Bell,
  },
  {
    title: 'Language and currency',
    text: 'Change Bangla or English, currency, theme, and Basic or Full mode from Settings.',
    icon: Languages,
  },
];

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-black uppercase tracking-wide text-indigo-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}

function GuideCard({ guide }: { guide: (typeof topics)[number]['guides'][number] }) {
  const Icon = guide.icon;
  const isRoute = guide.route.startsWith('/');

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">{guide.title}</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">{guide.route}</p>
          </div>
        </div>

        {isRoute && (
          <Link href={guide.route} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-700">
            Open page <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {guide.steps.map((step, index) => (
          <li key={step} className="grid grid-cols-[1.75rem_1fr] gap-3 text-sm leading-6 text-slate-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">
        <span className="font-black">Hint:</span> {guide.tip}
      </p>
    </article>
  );
}

export default function UserGuidePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNav active="guide" />

      <section id="start" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-black text-indigo-700 ring-1 ring-indigo-100">
              <BookOpen className="h-4 w-4" />
              User guide
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Learn TakaPilot in simple steps.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              A clean tutorial guide for users. Pick a topic and follow the exact steps without extra visual noise.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700">
                Create account <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#tutorials" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-100">
                Browse tutorials
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">Quick start</p>
            <div className="mt-4 space-y-3">
              {startSteps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="grid grid-cols-[auto_1fr] gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                      <h2 className="font-black text-slate-950">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8" aria-label="Guide sections">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <section id="flow" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 scroll-mt-24">
        <SectionHeader
          eyebrow="Recommended flow"
          title="Use the app in this order"
          description="This is the easiest path for new users. Once this flow is understood, the advanced features become easier."
        />
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {dailyFlow.map((item, index) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">{index + 1}</div>
              <h3 className="mt-4 font-black text-slate-950">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tutorials" className="border-y border-slate-200 bg-slate-50 py-10 scroll-mt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Feature tutorials"
            title="Separated guide for each topic"
            description="Each topic has its own section. The design is intentionally simple so users can follow the steps without distraction."
          />

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {topics.map((topic) => (
              <a key={topic.id} href={`#${topic.id}`} className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">
                {topic.title}
              </a>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr] lg:items-start">
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Topic menu</p>
                <nav className="mt-3 space-y-1" aria-label="Tutorial topics">
                  {topics.map((topic, index) => (
                    <a
                      key={topic.id}
                      href={`#${topic.id}`}
                      className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 group-hover:bg-indigo-600 group-hover:text-white">
                          {index + 1}
                        </span>
                        <span className="truncate">{topic.title}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {topic.guides.length}
                      </span>
                    </a>
                  ))}
                </nav>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <a href="#billing" className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                    Billing
                  </a>
                  <a href="#security" className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                    Security
                  </a>
                </div>
              </div>
            </aside>

            <div className="space-y-10">
              {topics.map((topic) => (
                <section key={topic.id} id={topic.id} className="scroll-mt-32">
                  <div className="mb-4 border-l-4 border-indigo-600 pl-4">
                    <h2 className="text-2xl font-black text-slate-950">{topic.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{topic.description}</p>
                  </div>
                  <div className="space-y-4">
                    {topic.guides.map((guide) => (
                      <GuideCard key={guide.title} guide={guide} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="billing" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <CreditCard className="h-7 w-7 text-emerald-600" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">Billing and subscription</h2>
            <div className="mt-4 space-y-3">
              {[
                'Trial package can be used without payment when available.',
                'Paid package requires manual bKash or Nagad payment submission.',
                'Temporary access may be available while admin verifies payment.',
                'Admin approval activates the selected package.',
                'Rejected or expired access requires a new valid request.',
              ].map((item) => (
                <p key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div id="security" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm scroll-mt-24">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">Security and support</h2>
            <div className="mt-4 space-y-3">
              {securityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="grid grid-cols-[auto_1fr] gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <Icon className="mt-0.5 h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-black text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Ready to start?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">Create an account, complete setup, and follow the tutorials step by step.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100">
              Register <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
