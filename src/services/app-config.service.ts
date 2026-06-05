import { prisma } from '@/lib/prisma';

const CONTACT_EMAIL_KEY = 'support.contactEmail';
const CONTACT_WHATSAPP_KEY = 'support.whatsappNumber';

export type PublicContactSettings = {
  contactEmail: string;
  whatsappNumber: string;
};

function getEnvContactSettings(): PublicContactSettings {
  return {
    contactEmail: process.env.WEB_PUSH_CONTACT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'admin@takapilot.local',
    whatsappNumber: process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP_NUMBER || '',
  };
}

function cleanValue(value: string | null | undefined) {
  return value?.trim() || '';
}

export async function getPublicContactSettings(): Promise<PublicContactSettings> {
  const fallback = getEnvContactSettings();
  const rows = await prisma.appConfig.findMany({
    where: { key: { in: [CONTACT_EMAIL_KEY, CONTACT_WHATSAPP_KEY] } },
  });
  const values = new Map(rows.map((row) => [row.key, cleanValue(row.value)]));

  return {
    contactEmail: values.get(CONTACT_EMAIL_KEY) || fallback.contactEmail,
    whatsappNumber: values.get(CONTACT_WHATSAPP_KEY) || fallback.whatsappNumber,
  };
}

export async function updatePublicContactSettings(input: PublicContactSettings): Promise<PublicContactSettings> {
  const contactEmail = cleanValue(input.contactEmail);
  const whatsappNumber = cleanValue(input.whatsappNumber);

  await prisma.$transaction([
    prisma.appConfig.upsert({
      where: { key: CONTACT_EMAIL_KEY },
      create: { key: CONTACT_EMAIL_KEY, value: contactEmail },
      update: { value: contactEmail },
    }),
    prisma.appConfig.upsert({
      where: { key: CONTACT_WHATSAPP_KEY },
      create: { key: CONTACT_WHATSAPP_KEY, value: whatsappNumber },
      update: { value: whatsappNumber },
    }),
  ]);

  return getPublicContactSettings();
}
