'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomInt } from 'crypto';
import { auth, signIn } from '@/lib/auth';
import { registerSchema, phoneRegistrationStartSchema, phoneOtpVerifySchema, changePasswordSchema, backdoorResetSchema, firstLoginPasswordSchema } from '@/lib/validations/auth';
import { assertRecoveryBackdoorEnabled } from '@/lib/recovery-backdoor';
import type { ActionResponse } from '@/types';
import { getRequestLocale } from '@/i18n/server';

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'INCOME' as const, icon: 'briefcase', color: '#10b981' },
  { name: 'Freelance', type: 'INCOME' as const, icon: 'laptop', color: '#06b6d4' },
  { name: 'Investments', type: 'INCOME' as const, icon: 'trending-up', color: '#8b5cf6' },
  { name: 'Other Income', type: 'INCOME' as const, icon: 'plus-circle', color: '#6366f1' },
  { name: 'Food & Dining', type: 'EXPENSE' as const, icon: 'utensils', color: '#ef4444' },
  { name: 'Transportation', type: 'EXPENSE' as const, icon: 'car', color: '#f97316' },
  { name: 'Housing', type: 'EXPENSE' as const, icon: 'home', color: '#eab308' },
  { name: 'Utilities', type: 'EXPENSE' as const, icon: 'zap', color: '#14b8a6' },
  { name: 'Entertainment', type: 'EXPENSE' as const, icon: 'film', color: '#ec4899' },
  { name: 'Shopping', type: 'EXPENSE' as const, icon: 'shopping-bag', color: '#a855f7' },
  { name: 'Healthcare', type: 'EXPENSE' as const, icon: 'heart', color: '#f43f5e' },
  { name: 'Education', type: 'EXPENSE' as const, icon: 'book', color: '#3b82f6' },
  { name: 'Personal', type: 'EXPENSE' as const, icon: 'user', color: '#64748b' },
  { name: 'Other Expense', type: 'EXPENSE' as const, icon: 'minus-circle', color: '#78716c' },
];

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizePhoneNumber(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (compact.startsWith('+8801') && compact.length === 14) return compact;
  if (compact.startsWith('8801') && compact.length === 13) return `+${compact}`;
  if (compact.startsWith('01') && compact.length === 11) return `+88${compact}`;
  return compact;
}

function isValidNormalizedPhone(phoneNumber: string) {
  return /^\+8801\d{9}$/.test(phoneNumber);
}

function otpSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'takapilot-local-otp-secret';
}

function hashOtp(phoneNumber: string, otpCode: string) {
  return createHmac('sha256', otpSecret()).update(`${phoneNumber}:${otpCode}`).digest('hex');
}

function shouldExposeOtp() {
  return process.env.NODE_ENV !== 'production' || process.env.PHONE_OTP_EXPOSE_CODE === 'true';
}

function generatedPhoneEmail(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  return `phone-${digits}@takapilot.local`;
}

export async function sendRegistrationOtpAction(formData: FormData): Promise<ActionResponse<{ phoneNumber: string; verificationId: string; expiresAt: string; devOtp?: string }>> {
  const raw = { phoneNumber: String(formData.get('phoneNumber') || '') };
  const parsed = phoneRegistrationStartSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  if (!isValidNormalizedPhone(phoneNumber)) {
    return { success: false, message: 'Enter a valid Bangladesh phone number.' };
  }

  const existing = await prisma.user.findFirst({ where: { phoneNumber } });
  if (existing) {
    return { success: false, message: 'This phone number is already registered.' };
  }

  await prisma.phoneOtpVerification.deleteMany({
    where: {
      phoneNumber,
      purpose: 'REGISTER',
      consumedAt: null,
      expiresAt: { lt: new Date() },
    },
  });

  const otpCode = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const verification = await prisma.phoneOtpVerification.create({
    data: {
      phoneNumber,
      purpose: 'REGISTER',
      otpHash: hashOtp(phoneNumber, otpCode),
      expiresAt,
    },
  });

  return {
    success: true,
    message: 'OTP generated successfully.',
    data: {
      phoneNumber,
      verificationId: verification.id,
      expiresAt: expiresAt.toISOString(),
      ...(shouldExposeOtp() ? { devOtp: otpCode } : {}),
    },
  };
}

export async function verifyRegistrationOtpAction(formData: FormData): Promise<ActionResponse<{ phoneNumber: string; verificationId: string }>> {
  const raw = {
    phoneNumber: String(formData.get('phoneNumber') || ''),
    otpCode: String(formData.get('otpCode') || ''),
  };
  const parsed = phoneOtpVerifySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  const verification = await prisma.phoneOtpVerification.findFirst({
    where: {
      phoneNumber,
      purpose: 'REGISTER',
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    return { success: false, message: 'OTP expired. Please request a new code.' };
  }
  if (verification.attempts >= 5) {
    return { success: false, message: 'Too many OTP attempts. Please request a new code.' };
  }

  const otpMatches = verification.otpHash === hashOtp(phoneNumber, parsed.data.otpCode);
  await prisma.phoneOtpVerification.update({
    where: { id: verification.id },
    data: {
      attempts: { increment: 1 },
      ...(otpMatches ? { verifiedAt: new Date() } : {}),
    },
  });

  if (!otpMatches) {
    return { success: false, message: 'Invalid OTP code.' };
  }

  return { success: true, message: 'Phone number verified.', data: { phoneNumber, verificationId: verification.id } };
}

export async function registerUser(formData: FormData): Promise<ActionResponse> {
  const raw = {
    username: formData.get('username') as string,
    email: String(formData.get('email') || '').trim() || undefined,
    phoneNumber: formData.get('phoneNumber') as string,
    otpVerificationId: formData.get('otpVerificationId') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    inviteToken: String(formData.get('inviteToken') || '').trim() || undefined,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);
  if (!isValidNormalizedPhone(phoneNumber)) {
    return { success: false, message: 'Enter a valid Bangladesh phone number.' };
  }

  const username = parsed.data.username.trim();
  const requestedEmail = parsed.data.email?.toLowerCase();

  const existingPhone = await prisma.user.findFirst({ where: { phoneNumber } });
  if (existingPhone) {
    return { success: false, message: 'This phone number is already registered.' };
  }

  const existingUsername = await prisma.user.findFirst({ where: { username } });
  if (existingUsername) {
    return { success: false, message: 'Username already taken.' };
  }

  if (requestedEmail) {
    const existingEmail = await prisma.user.findUnique({ where: { email: requestedEmail } });
    if (existingEmail) {
      return { success: false, message: 'Email already registered' };
    }
  }

  const verification = await prisma.phoneOtpVerification.findUnique({ where: { id: parsed.data.otpVerificationId } });
  if (!verification || verification.phoneNumber !== phoneNumber || verification.purpose !== 'REGISTER' || !verification.verifiedAt || verification.consumedAt || verification.expiresAt < new Date()) {
    return { success: false, message: 'Phone verification is missing or expired. Please verify again.' };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  const preferredLocale = await getRequestLocale();
  const userCount = await prisma.user.count();
  const inviteToken = parsed.data.inviteToken;
  const invite = inviteToken
    ? await prisma.userInvite.findUnique({
        where: { tokenHash: hashInviteToken(inviteToken) },
      })
    : null;

  if (inviteToken && !invite) {
    return { success: false, message: 'This invite link is not valid.' };
  }

  if (invite) {
    if (invite.acceptedAt) {
      return { success: false, message: 'This invite has already been used.' };
    }
    if (invite.expiresAt < new Date()) {
      return { success: false, message: 'This invite has expired.' };
    }
    if (requestedEmail && invite.email.toLowerCase() !== requestedEmail) {
      return { success: false, message: 'This invite was issued for a different email address.' };
    }
  }

  const email = invite?.email.toLowerCase() || requestedEmail || generatedPhoneEmail(phoneNumber);
  const existingFinalEmail = await prisma.user.findUnique({ where: { email } });
  if (existingFinalEmail) {
    return { success: false, message: 'Email already registered' };
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: username,
        username,
        email,
        phoneNumber,
        password: hashedPassword,
        currency: 'BDT',
        preferredLocale,
        role: userCount === 0 ? 'ADMIN' : invite?.role || 'USER',
        status: 'ACTIVE',
        emailVerifiedAt: invite || requestedEmail ? new Date() : null,
      },
    });

    await tx.phoneOtpVerification.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() },
    });

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        userId: user.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      })),
    });

    await tx.account.create({
      data: {
        userId: user.id,
        name: 'Cash',
        type: 'CASH',
        balance: 0,
        color: '#10b981',
        icon: 'wallet',
      },
    });

    if (invite) {
      const now = new Date();
      await tx.userInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: now },
      });

      if (invite.packageId) {
        const subscriptionPackage = await tx.subscriptionPackage.findUnique({ where: { id: invite.packageId } });
        if (subscriptionPackage) {
          const currentPeriodEnd = new Date(now);
          if (subscriptionPackage.interval === 'YEARLY') {
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
          } else {
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
          }

          await tx.userSubscription.create({
            data: {
              userId: user.id,
              packageId: subscriptionPackage.id,
              plan: 'PRO',
              interval: subscriptionPackage.interval,
              source: 'ADMIN_GRANT',
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd,
              grantedById: invite.invitedById,
            },
          });
        }
      }
    }
  });

  return { success: true, message: 'Account created successfully' };
}

export async function loginUser(formData: FormData): Promise<ActionResponse> {
  try {
    await signIn('credentials', {
      identifier: formData.get('identifier') as string,
      password: formData.get('password') as string,
      redirect: false,
    });
    return { success: true, message: 'Login successful' };
  } catch {
    return { success: false, message: 'Invalid phone/email or password' };
  }
}
export async function changePasswordAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const raw = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { success: false, message: 'User not found' };

  const passwordMatch = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!passwordMatch) {
    return { success: false, message: 'Incorrect current password' };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, mustChangePassword: false, sessionVersion: { increment: 1 } },
  });

  return { success: true, message: 'Password updated successfully' };
}

export async function completeFirstLoginPasswordAction(formData: FormData): Promise<ActionResponse> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  const raw = {
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = firstLoginPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, mustChangePassword: true },
  });
  if (!user) return { success: false, message: 'User not found' };
  if (!user.mustChangePassword) return { success: true, message: 'Password is already updated' };

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });

  return { success: true, message: 'Password updated successfully' };
}

export async function backdoorResetPasswordAction(formData: FormData): Promise<ActionResponse> {
  try {
    assertRecoveryBackdoorEnabled();
  } catch {
    return { success: false, message: 'Recovery mode is disabled.' };
  }

  const raw = {
    email: formData.get('email') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = backdoorResetSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { success: false, message: 'User not found' };

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, mustChangePassword: false, sessionVersion: { increment: 1 } },
  });

  return { success: true, message: 'Password reset successfully' };
}
