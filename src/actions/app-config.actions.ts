'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/rbac';
import { getPublicContactSettings, updatePublicContactSettings, type PublicContactSettings } from '@/services/app-config.service';
import type { ActionResponse } from '@/types';

export type AdminContactSettingsRow = PublicContactSettings;

function firstString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeWhatsAppInput(value: string) {
  return value.replace(/[\s()-]/g, '').trim();
}

function validateContactSettings(formData: FormData):
  | { success: true; data: AdminContactSettingsRow }
  | { success: false; message: string; errors: Record<string, string[]> } {
  const contactEmail = firstString(formData.get('contactEmail'));
  const whatsappNumber = normalizeWhatsAppInput(firstString(formData.get('whatsappNumber')));
  const errors: Record<string, string[]> = {};

  if (!contactEmail) errors.contactEmail = ['Contact email is required.'];
  if (contactEmail && !isValidEmail(contactEmail)) errors.contactEmail = ['Enter a valid email address.'];
  if (whatsappNumber && !/^\+?\d{8,15}$/.test(whatsappNumber)) {
    errors.whatsappNumber = ['Use digits only, optionally starting with +.'];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, message: 'Please fix the highlighted fields.', errors };
  }

  return { success: true, data: { contactEmail, whatsappNumber } };
}

export async function getAdminContactSettingsAction(): Promise<AdminContactSettingsRow> {
  await requireRole('ADMIN');
  return getPublicContactSettings();
}

export async function updateAdminContactSettingsAction(formData: FormData): Promise<ActionResponse<AdminContactSettingsRow>> {
  await requireRole('ADMIN');

  try {
    const parsed = validateContactSettings(formData);
    if (!parsed.success) return parsed;

    const data = await updatePublicContactSettings(parsed.data);
    revalidatePath('/admin/contact-settings');
    revalidatePath('/contact');
    revalidatePath('/subscription/payment');
    return { success: true, message: 'Contact settings updated.', data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Contact settings could not be updated.',
    };
  }
}
