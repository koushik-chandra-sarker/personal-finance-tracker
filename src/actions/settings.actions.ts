'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types';

export async function updateCurrencyAction(currency: string): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { currency },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true, message: 'Currency updated successfully' };
  } catch (error) {
    return { success: false, message: 'Failed to update currency' };
  }
}
