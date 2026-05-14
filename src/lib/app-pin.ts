import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const APP_PIN_UNLOCK_COOKIE = 'pft_app_pin_unlock';

type AppPinCookie = {
  userId: string;
  pinSetAt: string;
};

function getSigningSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'takapilot-dev-app-pin-secret';
}

function signPayload(payload: string) {
  return createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
}

function encodePayload(input: AppPinCookie) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

function decodePayload(value: string): AppPinCookie | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<AppPinCookie>;
    if (!parsed.userId || !parsed.pinSetAt) return null;
    return { userId: parsed.userId, pinSetAt: parsed.pinSetAt };
  } catch {
    return null;
  }
}

function parseCookieValue(value?: string): AppPinCookie | null {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  return decodePayload(payload);
}

function buildCookieValue(input: AppPinCookie) {
  const payload = encodePayload(input);
  return `${payload}.${signPayload(payload)}`;
}

export function isPinUnlockedForUser(cookieValue: string | undefined, userId: string, pinSetAt: Date | null | undefined) {
  if (!pinSetAt) return true;
  const parsed = parseCookieValue(cookieValue);
  return parsed?.userId === userId && parsed.pinSetAt === pinSetAt.toISOString();
}

export async function getAppPinUnlockState(userId: string, pinSetAt: Date | null | undefined) {
  if (!pinSetAt) return true;
  const cookieStore = await cookies();
  return isPinUnlockedForUser(cookieStore.get(APP_PIN_UNLOCK_COOKIE)?.value, userId, pinSetAt);
}

export async function setAppPinUnlockCookie(userId: string, pinSetAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(APP_PIN_UNLOCK_COOKIE, buildCookieValue({ userId, pinSetAt: pinSetAt.toISOString() }), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearAppPinUnlockCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(APP_PIN_UNLOCK_COOKIE);
}
