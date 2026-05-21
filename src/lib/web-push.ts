import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

type PushPayload = {
  title: string;
  body: string;
  url?: string | null;
  tag?: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'admin@takapilot.local';

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, contactEmail };
}

export function getWebPushPublicKey() {
  return getVapidConfig()?.publicKey || null;
}

export function isWebPushConfigured() {
  return Boolean(getVapidConfig());
}

function configureWebPush() {
  const config = getVapidConfig();
  if (!config) return false;

  webpush.setVapidDetails(`mailto:${config.contactEmail}`, config.publicKey, config.privateKey);
  return true;
}

export async function sendWebPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !configureWebPush()) {
    return { attemptedCount: 0, deliveredUserIds: [] as string[], expiredCount: 0 };
  }

  const subscriptions = await prisma.browserPushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: {
      id: true,
      userId: true,
      endpoint: true,
      p256dhKey: true,
      authKey: true,
    },
  });

  const deliveredUserIds = new Set<string>();
  const expiredSubscriptionIds: string[] = [];

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey,
        },
      }, JSON.stringify(payload));
      deliveredUserIds.add(subscription.userId);
      await prisma.browserPushSubscription.update({
        where: { id: subscription.id },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
      if (statusCode === 404 || statusCode === 410) {
        expiredSubscriptionIds.push(subscription.id);
      } else {
        console.error('Failed to send web push notification:', error);
      }
    }
  }));

  if (expiredSubscriptionIds.length > 0) {
    await prisma.browserPushSubscription.deleteMany({ where: { id: { in: expiredSubscriptionIds } } });
  }

  return {
    attemptedCount: subscriptions.length,
    deliveredUserIds: Array.from(deliveredUserIds),
    expiredCount: expiredSubscriptionIds.length,
  };
}
