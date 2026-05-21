'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getWebPushPublicKey } from '@/lib/web-push';
import type { ActionResponse } from '@/types';

type BrowserPushSubscriptionInput = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function getBrowserPushPublicKeyAction(): Promise<string | null> {
  return getWebPushPublicKey();
}

export async function saveBrowserPushSubscriptionAction(
  subscription: BrowserPushSubscriptionInput,
  userAgent?: string
): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const endpoint = subscription.endpoint?.trim();
  const p256dhKey = subscription.keys?.p256dh?.trim();
  const authKey = subscription.keys?.auth?.trim();

  if (!endpoint || !p256dhKey || !authKey) {
    return { success: false, message: 'Invalid browser push subscription.' };
  }

  await prisma.browserPushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      p256dhKey,
      authKey,
      userAgent: userAgent?.slice(0, 500) || null,
    },
    update: {
      userId: session.user.id,
      p256dhKey,
      authKey,
      userAgent: userAgent?.slice(0, 500) || null,
    },
  });

  return { success: true, message: 'Browser push notification is enabled.' };
}

export async function deleteBrowserPushSubscriptionAction(endpoint: string): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  await prisma.browserPushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint },
  });

  return { success: true, message: 'Browser push notification is removed.' };
}
