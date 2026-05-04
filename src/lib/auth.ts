import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { authConfig } from './auth.config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { subscription: true },
        });
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          currency: user.currency,
          role: user.role,
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
