import type { NextAuthConfig } from 'next-auth';
import type { SubscriptionInterval, SubscriptionPlan, SubscriptionSource, SubscriptionStatus, UserRole } from '@/types';

type SessionUpdate = {
  id?: string;
  currency?: string;
  role?: UserRole;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionInterval?: SubscriptionInterval | null;
  subscriptionSource?: SubscriptionSource;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string | null;
  subscriptionCancelAtPeriodEnd?: boolean;
};

function hasActiveSessionAccess(user?: {
  role?: UserRole;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string | null;
}) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.subscriptionPlan !== 'PRO') return false;
  if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'TRIALING') return false;
  if (!user.subscriptionCurrentPeriodEnd) return true;
  return new Date(user.subscriptionCurrentPeriodEnd) >= new Date();
}

function getSubscriptionBlockReason(user?: {
  role?: UserRole;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string | null;
}) {
  if (!user || user.subscriptionPlan !== 'PRO') return 'missing';
  if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'TRIALING') return 'inactive';
  if (user.subscriptionCurrentPeriodEnd && new Date(user.subscriptionCurrentPeriodEnd) < new Date()) return 'expired';
  return 'invalid';
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith('/login') || 
        nextUrl.pathname.startsWith('/register') || 
        nextUrl.pathname.startsWith('/recovery-backdoor');
      const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || 
        nextUrl.pathname.startsWith('/transactions') ||
        nextUrl.pathname.startsWith('/accounts') || 
        nextUrl.pathname.startsWith('/budgets') ||
        nextUrl.pathname.startsWith('/goals') || 
        nextUrl.pathname.startsWith('/notes') ||
        nextUrl.pathname.startsWith('/recurring') ||
        nextUrl.pathname.startsWith('/reports') || 
        nextUrl.pathname.startsWith('/settings') ||
        nextUrl.pathname.startsWith('/subscription');
      const isSubscriptionAllowedRoute = nextUrl.pathname.startsWith('/subscription');

      if (isProtectedRoute) {
        if (!isLoggedIn) return false;
        if (isSubscriptionAllowedRoute || hasActiveSessionAccess(auth.user)) return true;
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
        appToken.subscriptionPlan = user.subscriptionPlan;
        appToken.subscriptionInterval = user.subscriptionInterval;
        appToken.subscriptionSource = user.subscriptionSource;
        appToken.subscriptionStatus = user.subscriptionStatus;
        appToken.subscriptionCurrentPeriodEnd = user.subscriptionCurrentPeriodEnd;
        appToken.subscriptionCancelAtPeriodEnd = user.subscriptionCancelAtPeriodEnd;
      }
      if (trigger === "update" && session) {
        const updatedSession = session as SessionUpdate;
        if (updatedSession.currency) appToken.currency = updatedSession.currency;
        if (updatedSession.subscriptionPlan) appToken.subscriptionPlan = updatedSession.subscriptionPlan;
        if (updatedSession.subscriptionInterval !== undefined) appToken.subscriptionInterval = updatedSession.subscriptionInterval;
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
        session.user.subscriptionPlan = appToken.subscriptionPlan;
        session.user.subscriptionInterval = appToken.subscriptionInterval;
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
