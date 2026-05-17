import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/providers/Providers';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { getMessages } from '@/i18n/messages';
import { getRequestLocale } from '@/i18n/server';

const defaultMessages = getMessages(DEFAULT_LOCALE);

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: defaultMessages.metadata.title,
  description: defaultMessages.metadata.description,
  keywords: [...defaultMessages.metadata.keywords],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
