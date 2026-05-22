'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { clearAppPinUnlockCookie, setAppPinUnlockCookie } from '@/lib/app-pin';
import { createAppPinSchema, verifyAppPinSchema } from '@/lib/validations/app-pin';
import type { ActionResponse } from '@/types';

function firstString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user;
}

export async function createAppPinAction(formData: FormData): Promise<ActionResponse<{ hasPin: true; unlockKey: string }>> {
  try {
    const user = await getSessionUser();
    const parsed = createAppPinSchema.safeParse({
      pin: firstString(formData.get('pin')),
      confirmPin: firstString(formData.get('confirmPin')),
    });

    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    const now = new Date();
    const pinHash = await bcrypt.hash(parsed.data.pin, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        appPinHash: pinHash,
        appPinSetAt: now,
        appPinResetAt: null,
        appPinReminderAt: null,
      },
    });
    await setAppPinUnlockCookie(user.id, now);
    revalidatePath('/', 'layout');

    return { success: true, message: 'Security PIN created.', data: { hasPin: true, unlockKey: now.toISOString() } };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to create PIN.') };
  }
}

export async function remindAppPinLaterAction(): Promise<ActionResponse<{ remindAt: string }>> {
  try {
    const user = await getSessionUser();
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + 7);

    await prisma.user.update({
      where: { id: user.id },
      data: { appPinReminderAt: remindAt },
    });

    revalidatePath('/', 'layout');
    return {
      success: true,
      message: 'We will remind you again in 7 days.',
      data: { remindAt: remindAt.toISOString() },
    };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to save reminder.') };
  }
}

export async function verifyAppPinAction(formData: FormData): Promise<ActionResponse> {
  try {
    const sessionUser = await getSessionUser();
    const parsed = verifyAppPinSchema.safeParse({ pin: firstString(formData.get('pin')) });
    if (!parsed.success) {
      return { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors };
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { appPinHash: true, appPinSetAt: true },
    });

    if (!user?.appPinHash || !user.appPinSetAt) {
      await clearAppPinUnlockCookie();
      return { success: true, message: 'No PIN is configured.' };
    }

    const isMatch = await bcrypt.compare(parsed.data.pin, user.appPinHash);
    if (!isMatch) {
      return { success: false, message: 'Incorrect PIN.' };
    }

    await setAppPinUnlockCookie(sessionUser.id, user.appPinSetAt);
    revalidatePath('/', 'layout');
    return { success: true, message: 'PIN unlocked.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to verify PIN.') };
  }
}

export async function clearCurrentAppPinUnlockAction(): Promise<ActionResponse> {
  try {
    await getSessionUser();
    await clearAppPinUnlockCookie();
    revalidatePath('/', 'layout');
    return { success: true, message: 'PIN lock cleared.' };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, 'Failed to clear PIN lock.') };
  }
}

export async function getAppPinStatusAction(): Promise<{ hasPin: boolean; pinSetAt: string | null }> {
  const user = await getSessionUser();
  const pinState = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appPinHash: true, appPinSetAt: true },
  });

  return {
    hasPin: Boolean(pinState?.appPinHash && pinState.appPinSetAt),
    pinSetAt: pinState?.appPinSetAt?.toISOString() || null,
  };
}
