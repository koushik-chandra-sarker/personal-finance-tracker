import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock3, HelpCircle, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/public/PublicNav';
import { auth } from '@/lib/auth';
import { getRequestLocale } from '@/i18n/server';
import type { AppLocale } from '@/i18n/config';
import { getPublicContactSettings } from '@/services/app-config.service';

export const metadata: Metadata = {
  title: 'Contact - TakaPilot',
  description: 'Contact TakaPilot support for account, subscription, payment, and product help.',
};

const contactCopy: Record<AppLocale, {
  eyebrow: string;
  title: string;
  text: string;
  emailTitle: string;
  emailText: string;
  whatsappTitle: string;
  whatsappText: string;
  unavailable: string;
  responseTitle: string;
  responseText: string;
  helpTitle: string;
  helpItems: string[];
  secureTitle: string;
  secureText: string;
  guideCta: string;
  registerCta: string;
}> = {
  'bn-BD': {
    eyebrow: 'সাপোর্ট',
    title: 'সহায়তা লাগলে আমাদের সাথে যোগাযোগ করুন।',
    text: 'অ্যাকাউন্ট, সাবস্ক্রিপশন, পেমেন্ট অনুমোদন, বা অ্যাপ ব্যবহারে কোনো সমস্যা হলে এখানে থেকে দ্রুত যোগাযোগ করতে পারবেন।',
    emailTitle: 'ইমেইল সাপোর্ট',
    emailText: 'বিস্তারিত সমস্যা, ফোন নম্বর, এবং পেমেন্ট রেফারেন্স থাকলে সেটি লিখুন।',
    whatsappTitle: 'WhatsApp',
    whatsappText: 'পেমেন্ট বা জরুরি অ্যাকাউন্ট সহায়তার জন্য সরাসরি মেসেজ করুন।',
    unavailable: 'এখনও কনফিগার করা হয়নি',
    responseTitle: 'সাপোর্ট সময়',
    responseText: 'আমরা যত দ্রুত সম্ভব উত্তর দিই। পেমেন্ট যাচাইয়ের জন্য ট্রানজ্যাকশন আইডি দিলে দ্রুত সহায়তা করা যায়।',
    helpTitle: 'যেসব বিষয়ে সাহায্য পাবেন',
    helpItems: ['লগইন বা রেজিস্ট্রেশন সমস্যা', 'সাবস্ক্রিপশন ও পেমেন্ট অনুমোদন', 'ডেটা, রিপোর্ট, বা সেটিংস নিয়ে সহায়তা'],
    secureTitle: 'নিরাপদ যোগাযোগ',
    secureText: 'পাসওয়ার্ড, PIN, বা OTP কখনও শেয়ার করবেন না। সাপোর্ট শুধু প্রয়োজনীয় রেফারেন্স তথ্য চাইবে।',
    guideCta: 'গাইড দেখুন',
    registerCta: 'অ্যাকাউন্ট তৈরি করুন',
  },
  'en-US': {
    eyebrow: 'Support',
    title: 'Contact us when you need help.',
    text: 'Get help with account access, subscriptions, payment approval, or using TakaPilot features from one simple page.',
    emailTitle: 'Email Support',
    emailText: 'Share the issue, phone number, and payment reference if it is payment related.',
    whatsappTitle: 'WhatsApp',
    whatsappText: 'Message directly for payment or urgent account support.',
    unavailable: 'Not configured yet',
    responseTitle: 'Support Time',
    responseText: 'We reply as soon as possible. For payment verification, include the transaction ID for faster help.',
    helpTitle: 'What We Can Help With',
    helpItems: ['Login or registration issues', 'Subscription and payment approval', 'Data, reports, or settings questions'],
    secureTitle: 'Secure Contact',
    secureText: 'Never share your password, PIN, or OTP. Support will only ask for necessary reference information.',
    guideCta: 'View Guide',
    registerCta: 'Create Account',
  },
};

function buildWhatsappHref(number: string, locale: AppLocale) {
  const digits = number.replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.startsWith('880') ? digits : `88${digits}`;
  const message = locale === 'bn-BD'
    ? 'আমি TakaPilot সাপোর্ট চাই।'
    : 'I need TakaPilot support.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default async function ContactPage() {
  const [session, locale, contactSettings] = await Promise.all([auth(), getRequestLocale(), getPublicContactSettings()]);
  const copy = contactCopy[locale];
  const supportEmail = contactSettings.contactEmail;
  const whatsappNumber = contactSettings.whatsappNumber;
  const whatsappHref = buildWhatsappHref(whatsappNumber, locale);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950 dark:bg-slate-950 dark:text-white">
      <PublicNav active="contact" isAuthenticated={Boolean(session?.user)} locale={locale} />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-16 lg:pt-10">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-black text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-white/10 dark:text-emerald-200">
            <HelpCircle className="h-4 w-4" />
            {copy.eyebrow}
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {copy.text}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/guide" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              {copy.guideCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!session?.user && (
              <Link href="/register" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                {copy.registerCta}
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <a href={`mailto:${supportEmail}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/10">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                <Mail className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">{copy.emailTitle}</h2>
                <p className="mt-1 break-words text-sm font-black text-emerald-700 dark:text-emerald-200">{supportEmail}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.emailText}</p>
              </div>
            </div>
          </a>

          <a href={whatsappHref || undefined} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/10" aria-disabled={!whatsappHref}>
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">{copy.whatsappTitle}</h2>
                <p className="mt-1 break-words text-sm font-black text-sky-700 dark:text-sky-200">{whatsappNumber || copy.unavailable}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.whatsappText}</p>
              </div>
            </div>
          </a>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-10 dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <Clock3 className="h-6 w-6 text-emerald-700 dark:text-emerald-200" />
            <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{copy.responseTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.responseText}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <HelpCircle className="h-6 w-6 text-indigo-700 dark:text-indigo-200" />
            <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{copy.helpTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {copy.helpItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <ShieldCheck className="h-6 w-6 text-rose-700 dark:text-rose-200" />
            <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{copy.secureTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.secureText}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
