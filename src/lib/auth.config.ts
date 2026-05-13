import type { NextAuthConfig } from 'next-auth';
import type { SubscriptionInterval, SubscriptionPlan, SubscriptionSource, SubscriptionStatus, UserRole, UserStatus } from '@/types';
import { getSubscriptionBlockReason, hasActiveSubscriptionAccess, isSubscriptionUnlockedPath } from '@/lib/subscription-access';

type SessionUpdate = {
  id?: string;
  currency?: string;
  role?: UserRole;
  status?: UserStatus;
  lastLoginAt?: string | null;
  mustChangePassword?: boolean;
  sessionVersion?: number;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionInterval?: SubscriptionInterval | null;
  subscriptionPackageId?: string | null;
  subscriptionSource?: SubscriptionSource;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string | null;
  subscriptionCancelAtPeriodEnd?: boolean;
};

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPasswordChangeRoute = nextUrl.pathname.startsWith('/change-password');
      const isAuthPage = nextUrl.pathname.startsWith('/login') || 
        nextUrl.pathname.startsWith('/register') || 
        nextUrl.pathname.startsWith('/recovery-backdoor');
      const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || 
        nextUrl.pathname.startsWith('/admin') ||
        nextUrl.pathname.startsWith('/transactions') ||
        nextUrl.pathname.startsWith('/accounts') || 
        nextUrl.pathname.startsWith('/budgets') ||
        nextUrl.pathname.startsWith('/goals') || 
        nextUrl.pathname.startsWith('/notes') ||
        nextUrl.pathname.startsWith('/recurring') ||
        nextUrl.pathname.startsWith('/reports') || 
        nextUrl.pathname.startsWith('/settings') ||
        nextUrl.pathname.startsWith('/subscription');
      const isSubscriptionAllowedRoute = isSubscriptionUnlockedPath(nextUrl.pathname);

      if (isPasswordChangeRoute) {
        if (!isLoggedIn) return false;
        if (!auth.user.mustChangePassword) return Response.redirect(new URL('/dashboard', nextUrl));
        return true;
      }

      if (isProtectedRoute) {
        if (!isLoggedIn) return false;
        if (auth.user.mustChangePassword) {
          const passwordUrl = new URL('/change-password', nextUrl);
          passwordUrl.searchParams.set('next', `${nextUrl.pathname}${nextUrl.search}`);
          return Response.redirect(passwordUrl);
        }
        if (isSubscriptionAllowedRoute || hasActiveSubscriptionAccess(auth.user)) return true;
        const subscriptionUrl = new URL('/subscription', nextUrl);
        subscriptionUrl.searchParams.set('reason', getSubscriptionBlockReason(auth.user));
        subscriptionUrl.searchParams.set('next', `${nextUrl.pathname}${nextUrl.search}`);
        return Response.redirect(subscriptionUrl);
      } else if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      const appToken = token as typeof token & SessionUpdate;
      if (user) {
        appToken.id = user.id;
        appToken.currency = user.currency;
        appToken.role = user.role;
        appToken.status = user.status;
        appToken.lastLoginAt = user.lastLoginAt;
        appToken.mustChangePassword = user.mustChangePassword;
        appToken.sessionVersion = user.sessionVersion;
        appToken.subscriptionPlan = user.subscriptionPlan;
        appToken.subscriptionInterval = user.subscriptionInterval;
        appToken.subscriptionPackageId = user.subscriptionPackageId;
        appToken.subscriptionSource = user.subscriptionSource;
        appToken.subscriptionStatus = user.subscriptionStatus;
        appToken.subscriptionCurrentPeriodEnd = user.subscriptionCurrentPeriodEnd;
        appToken.subscriptionCancelAtPeriodEnd = user.subscriptionCancelAtPeriodEnd;
      }
      if (trigger === "update" && session) {
        const updatedSession = session as SessionUpdate;
        if (updatedSession.currency) appToken.currency = updatedSession.currency;
        if (updatedSession.status) appToken.status = updatedSession.status;
        if (updatedSession.lastLoginAt !== undefined) appToken.lastLoginAt = updatedSession.lastLoginAt;
        if (updatedSession.mustChangePassword !== undefined) appToken.mustChangePassword = updatedSession.mustChangePassword;
        if (updatedSession.sessionVersion !== undefined) appToken.sessionVersion = updatedSession.sessionVersion;
        if (updatedSession.subscriptionPlan) appToken.subscriptionPlan = updatedSession.subscriptionPlan;
        if (updatedSession.subscriptionInterval !== undefined) appToken.subscriptionInterval = updatedSession.subscriptionInterval;
        if (updatedSession.subscriptionPackageId !== undefined) appToken.subscriptionPackageId = updatedSession.subscriptionPackageId;
        if (updatedSession.subscriptionSource) appToken.subscriptionSource = updatedSession.subscriptionSource;
        if (updatedSession.subscriptionStatus) appToken.subscriptionStatus = updatedSession.subscriptionStatus;
        if (updatedSession.subscriptionCurrentPeriodEnd !== undefined) appToken.subscriptionCurrentPeriodEnd = updatedSession.subscriptionCurrentPeriodEnd;
        if (updatedSession.subscriptionCancelAtPeriodEnd !== undefined) {
          appToken.subscriptionCancelAtPeriodEnd = updatedSession.subscriptionCancelAtPeriodEnd;
        }
      }
      return appToken;
    },
    async session({ session, token }) {
      const appToken = token as typeof token & SessionUpdate;
      if (session.user && appToken.id) {
        session.user.id = appToken.id;
        session.user.currency = appToken.currency;
        session.user.role = appToken.role;
        session.user.status = appToken.status;
        session.user.lastLoginAt = appToken.lastLoginAt;
        session.user.mustChangePassword = appToken.mustChangePassword;
        session.user.sessionVersion = appToken.sessionVersion;
        session.user.subscriptionPlan = appToken.subscriptionPlan;
        session.user.subscriptionInterval = appToken.subscriptionInterval;
        session.user.subscriptionPackageId = appToken.subscriptionPackageId;
        session.user.subscriptionSource = appToken.subscriptionSource;
        session.user.subscriptionStatus = appToken.subscriptionStatus;
        session.user.subscriptionCurrentPeriodEnd = appToken.subscriptionCurrentPeriodEnd;
        session.user.subscriptionCancelAtPeriodEnd = appToken.subscriptionCancelAtPeriodEnd;
      }
      return session;
    },
  },
  providers: [], // Add providers with restricted syntax in auth.ts
} satisfies NextAuthConfig;
