import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authConfig } from './auth.config';
import { normalizeLocale } from '@/i18n/config';

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(6),
});

function normalizePhoneNumber(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (compact.startsWith('+8801') && compact.length === 14) return compact;
  if (compact.startsWith('8801') && compact.length === 13) return `+${compact}`;
  if (compact.startsWith('01') && compact.length === 11) return `+88${compact}`;
  return compact;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const identifier = parsed.data.identifier.trim();
        const isEmail = identifier.includes('@');
        const user = await prisma.user.findFirst({
          where: isEmail
            ? { email: identifier.toLowerCase() }
            : { phoneNumber: normalizePhoneNumber(identifier) },
          include: { subscription: true },
        });
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.password);
        if (!passwordMatch) return null;
        if (user.status !== 'ACTIVE') return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const lastLoginAt = new Date();
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          currency: user.currency,
          preferredLocale: normalizeLocale(user.preferredLocale),
          experienceMode: user.experienceMode,
          onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() || null,
          role: user.role,
          status: user.status,
          lastLoginAt: lastLoginAt.toISOString(),
          mustChangePassword: user.mustChangePassword,
          sessionVersion: user.sessionVersion,
          subscriptionPlan: user.subscription?.plan,
          subscriptionInterval: user.subscription?.interval || null,
          subscriptionPackageId: user.subscription?.packageId || null,
          subscriptionSource: user.subscription?.source,
          subscriptionStatus: user.subscription?.status || 'ACTIVE',
          subscriptionCurrentPeriodEnd: user.subscription?.currentPeriodEnd?.toISOString() || null,
          subscriptionCancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || false,
        };
      },
    }),
  ],
});
