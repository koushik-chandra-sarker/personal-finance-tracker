import { createHash, randomUUID } from 'crypto';
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

const VISITOR_COOKIE = 'pft_visitor_id';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

function hashIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const ip = forwardedFor || realIp;
  if (!ip) return null;

  const salt = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fintrack-analytics';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const path = cleanAnalyticsPath(payload.path);
  if (!path) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || randomUUID();
  const sessionId = request.cookies.get(VISIT_SESSION_COOKIE)?.value || randomUUID();
  const userAgent = truncateAnalyticsValue(request.headers.get('user-agent'), 500);
  const referrer = truncateAnalyticsValue(typeof payload.referrer === 'string' ? payload.referrer : null, 500);
  const session = await auth();

  await prisma.pageView.create({
    data: {
      userId: session?.user?.id || null,
      visitorId,
      sessionId,
      path,
      referrer,
      userAgent,
      deviceType: detectDeviceType(userAgent),
      browser: detectBrowser(userAgent),
      ipHash: hashIp(request),
    },
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: VISITOR_MAX_AGE,
  });
  response.cookies.set(VISIT_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: VISIT_SESSION_MAX_AGE,
  });

  return response;
}
