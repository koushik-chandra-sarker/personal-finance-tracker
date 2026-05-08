import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  cleanAnalyticsPath,
  detectBrowser,
  detectDeviceType,
  truncateAnalyticsValue,
  VISIT_SESSION_COOKIE,
  VISIT_SESSION_MAX_AGE,
} from '@/lib/analytics';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const currentPath = cleanAnalyticsPath(payload.path);
  if (!currentPath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

  const sessionId = request.cookies.get(VISIT_SESSION_COOKIE)?.value || randomUUID();
  const userAgent = truncateAnalyticsValue(request.headers.get('user-agent'), 500);
  const now = new Date();

  await prisma.userActivity.upsert({
    where: {
      userId_sessionId: {
        userId: session.user.id,
        sessionId,
      },
    },
    create: {
      userId: session.user.id,
      sessionId,
      currentPath,
      userAgent,
      deviceType: detectDeviceType(userAgent),
      browser: detectBrowser(userAgent),
      lastSeenAt: now,
    },
    update: {
      currentPath,
      userAgent,
      deviceType: detectDeviceType(userAgent),
      browser: detectBrowser(userAgent),
      lastSeenAt: now,
    },
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(VISIT_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: VISIT_SESSION_MAX_AGE,
  });

  return response;
}
