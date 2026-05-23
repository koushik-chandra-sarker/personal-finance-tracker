import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import LoginClient from './LoginClient';

function redirectPathForAuthenticatedUser(user: { mustChangePassword?: boolean; onboardingCompletedAt?: string | null }) {
  if (user.mustChangePassword) return '/change-password';
  if (user.onboardingCompletedAt === null) return '/onboarding';
  return '/dashboard';
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect(redirectPathForAuthenticatedUser(session.user));

  return <LoginClient />;
}
