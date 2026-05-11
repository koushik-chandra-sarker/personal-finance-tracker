import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const SUPPORT_VIEW_COOKIE = 'pft_support_view';

type SupportViewCookie = {
  sessionId: string;
  signature: string;
};

export type ActiveSupportView = {
  sessionId: string;
  targetUserId: string;
  adminId: string;
  expiresAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

function getSigningSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'takapilot-dev-support-secret';
}

function signSessionId(sessionId: string) {
  return createHmac('sha256', getSigningSecret()).update(sessionId).digest('hex');
}

function parseCookieValue(value?: string): SupportViewCookie | null {
  if (!value) return null;
  const [sessionId, signature] = value.split('.');
  if (!sessionId || !signature) return null;

  const expected = signSessionId(sessionId);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  return { sessionId, signature };
}

export function buildSupportViewCookieValue(sessionId: string) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

export async function setSupportViewCookie(sessionId: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SUPPORT_VIEW_COOKIE, buildSupportViewCookieValue(sessionId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  });
}

export async function clearSupportViewCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPPORT_VIEW_COOKIE);
}

export async function getActiveSupportView(): Promise<ActiveSupportView | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'ADMIN') return null;

  const cookieStore = await cookies();
  const parsed = parseCookieValue(cookieStore.get(SUPPORT_VIEW_COOKIE)?.value);
  if (!parsed) return null;

  const now = new Date();
  const supportSession = await prisma.supportAccessSession.findFirst({
    where: {
      id: parsed.sessionId,
      adminId: session.user.id,
      verifiedAt: { not: null },
      revokedAt: null,
      pinExpiresAt: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      adminId: true,
      pinExpiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!supportSession?.adminId) return null;

  return {
    sessionId: supportSession.id,
    targetUserId: supportSession.userId,
    adminId: supportSession.adminId,
    expiresAt: supportSession.pinExpiresAt,
    user: supportSession.user,
  };
}
