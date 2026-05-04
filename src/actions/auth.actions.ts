'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth, signIn } from '@/lib/auth';
import { registerSchema, changePasswordSchema, backdoorResetSchema } from '@/lib/validations/auth';
import { assertRecoveryBackdoorEnabled } from '@/lib/recovery-backdoor';
import type { ActionResponse } from '@/types';

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

export async function registerUser(formData: FormData): Promise<ActionResponse> {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { success: false, message: 'Email already registered' };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  const userCount = await prisma.user.count();

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: userCount === 0 ? 'ADMIN' : 'USER',
    },
  });

  // Create default categories
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      userId: user.id,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
    })),
  });

  // Create default cash account
  await prisma.account.create({
    data: {
      userId: user.id,
      name: 'Cash',
      type: 'CASH',
      balance: 0,
      color: '#10b981',
      icon: 'wallet',
    },
  });

  return { success: true, message: 'Account created successfully' };
}

export async function loginUser(formData: FormData): Promise<ActionResponse> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: false,
    });
    return { success: true, message: 'Login successful' };
  } catch {
    return { success: false, message: 'Invalid email or password' };
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
    data: { password: hashedPassword },
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
    data: { password: hashedPassword },
  });

  return { success: true, message: 'Password reset successfully' };
}
