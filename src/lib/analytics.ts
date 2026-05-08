export const VISIT_SESSION_COOKIE = 'pft_visit_session_id';
export const VISIT_SESSION_MAX_AGE = 60 * 30;

export function truncateAnalyticsValue(value: string | null | undefined, maxLength: number) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function cleanAnalyticsPath(value: unknown) {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path.split('?')[0].slice(0, 240) || '/';
}

export function detectDeviceType(userAgent: string | null) {
  if (!userAgent) return null;
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|iphone|android/i.test(userAgent)) return 'mobile';
  if (/bot|crawler|spider|slurp/i.test(userAgent)) return 'bot';
  return 'desktop';
}

export function detectBrowser(userAgent: string | null) {
  if (!userAgent) return null;
  if (/edg\//i.test(userAgent)) return 'Edge';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return 'Safari';
  return 'Other';
}
