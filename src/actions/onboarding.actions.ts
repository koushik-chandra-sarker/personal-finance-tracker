'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { clearUserWorkspaceData } from '@/lib/user-data-cleanup';
import { normalizeLocale, type AppLocale } from '@/i18n/config';
import { setLocaleCookie } from '@/i18n/server';
import { revalidatePath } from 'next/cache';
import type { ActionResponse, UserExperienceMode } from '@/types';

const SUPPORTED_CURRENCIES = new Set(['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']);
const EXPERIENCE_MODES = new Set<UserExperienceMode>(['BASIC', 'FULL']);

function normalizeCurrency(value: FormDataEntryValue | null) {
  const currency = String(value || '').trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(currency) ? currency : 'BDT';
}

function normalizeExperienceMode(value: FormDataEntryValue | null): UserExperienceMode {
  const mode = String(value || '').trim().toUpperCase() as UserExperienceMode;
  return EXPERIENCE_MODES.has(mode) ? mode : 'FULL';
}

function shouldUseStarterData(value: FormDataEntryValue | null) {
  return String(value || 'starter') !== 'blank';
}

export async function completeOnboardingAction(formData: FormData): Promise<ActionResponse<{
  preferredLocale: AppLocale;
  currency: string;
  experienceMode: UserExperienceMode;
  onboardingCompletedAt: string;
}>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const preferredLocale = normalizeLocale(String(formData.get('preferredLocale') || ''));
  const currency = normalizeCurrency(formData.get('currency'));
  const experienceMode = normalizeExperienceMode(formData.get('experienceMode'));
  const recreateStarterData = shouldUseStarterData(formData.get('starterData'));
  const onboardingCompletedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await clearUserWorkspaceData(tx, session.user.id, { recreateStarterData });
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          preferredLocale,
          currency,
          experienceMode,
          onboardingCompletedAt,
        },
      });
    }, { timeout: 30000 });

    await setLocaleCookie(preferredLocale);
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/settings');

    return {
      success: true,
      message: 'Setup completed. Your workspace is ready.',
      data: {
        preferredLocale,
        currency,
        experienceMode,
        onboardingCompletedAt: onboardingCompletedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    return { success: false, message: 'Failed to complete setup. Please try again.' };
  }
}
