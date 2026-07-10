import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SettingsPageClient from '@/components/settings/SettingsPageClient';

export default async function SettingsPage() {
  const session = await auth();
  const userState = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          experienceMode: true,
          financialMonthStartDay: true,
          appPinHash: true,
          appPinSetAt: true,
          subscription: {
            select: {
              packageId: true,
              plan: true,
              interval: true,
              source: true,
              status: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
            },
          },
        },
      })
    : null;

  return (
    <SettingsPageClient
      initialAppPinStatus={{
        hasPin: Boolean(userState?.appPinHash && userState.appPinSetAt),
        pinSetAt: userState?.appPinSetAt?.toISOString() || null,
      }}
      initialExperienceMode={userState?.experienceMode || 'FULL'}
      initialFinancialMonthStartDay={userState?.financialMonthStartDay || 1}
      initialSubscription={{
        plan: userState?.subscription?.plan || null,
        interval: userState?.subscription?.interval || null,
        packageId: userState?.subscription?.packageId || null,
        source: userState?.subscription?.source || null,
        status: userState?.subscription?.status || null,
        currentPeriodEnd: userState?.subscription?.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: userState?.subscription?.cancelAtPeriodEnd || false,
      }}
    />
  );
}
