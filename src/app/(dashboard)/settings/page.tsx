import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SettingsPageClient from '@/components/settings/SettingsPageClient';

export default async function SettingsPage() {
  const session = await auth();
  const pinState = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { appPinHash: true, appPinSetAt: true },
      })
    : null;

  return (
    <SettingsPageClient
      initialAppPinStatus={{
        hasPin: Boolean(pinState?.appPinHash && pinState.appPinSetAt),
        pinSetAt: pinState?.appPinSetAt?.toISOString() || null,
      }}
    />
  );
}
