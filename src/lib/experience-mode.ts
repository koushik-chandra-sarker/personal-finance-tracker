import type { UserExperienceMode } from '@prisma/client';

export type ExperienceMode = UserExperienceMode | 'BASIC' | 'FULL' | string | null | undefined;

const BASIC_BLOCKED_PATH_PREFIXES = [
  '/goals',
  '/investments',
  '/salary-planner',
  '/tax-calculator',
  '/recurring',
  '/service-tracker',
  '/notes',
];

export function isBasicExperienceMode(mode: ExperienceMode) {
  return mode === 'BASIC';
}

export function isBasicModeBlockedPath(pathname: string, mode: ExperienceMode) {
  if (!isBasicExperienceMode(mode)) return false;
  return BASIC_BLOCKED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isVisibleForExperienceMode(href: string, mode: ExperienceMode) {
  return !isBasicModeBlockedPath(href, mode);
}
