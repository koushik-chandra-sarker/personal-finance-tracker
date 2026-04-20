import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/providers/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'FinTrack — Personal Finance Manager',
  description: 'Track your income, expenses, budgets, and savings goals with FinTrack. A modern personal finance management app.',
  keywords: ['finance', 'budget', 'expense tracker', 'savings', 'money management'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
