import type { NextAuthConfig } from 'next-auth';

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
        nextUrl.pathname.startsWith('/recurring') ||
        nextUrl.pathname.startsWith('/reports') || 
        nextUrl.pathname.startsWith('/settings');

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to unauthenticated
      } else if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.currency = (user as any).currency;
      }
      if (trigger === "update" && session?.currency) {
        token.currency = session.currency;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session.user as any).currency = token.currency as string;
      }
      return session;
    },
  },
  providers: [], // Add providers with restricted syntax in auth.ts
} satisfies NextAuthConfig;
