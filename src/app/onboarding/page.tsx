import OnboardingClient from '@/components/onboarding/OnboardingClient';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeLocale } from '@/i18n/config';
import { redirect } from 'next/navigation';

function getSafeNextPath(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  if (raw.startsWith('/login') || raw.startsWith('/register') || raw.startsWith('/onboarding')) return '/dashboard';
  return raw;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const params = await searchParams;
  const nextPath = getSafeNextPath(params?.next);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      currency: true,
      preferredLocale: true,
      experienceMode: true,
      onboardingCompletedAt: true,
      mustChangePassword: true,
    },
  });

  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/change-password');
  if (user.onboardingCompletedAt) redirect(nextPath);

  return (
    <OnboardingClient
      initialCurrency={user.currency || 'BDT'}
      initialLocale={normalizeLocale(user.preferredLocale)}
      initialExperienceMode={user.experienceMode || 'FULL'}
      nextPath={nextPath}
    />
  );
}
