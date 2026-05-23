import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

function redirectPathForAuthenticatedUser(user: { mustChangePassword?: boolean; onboardingCompletedAt?: string | null }) {
  if (user.mustChangePassword) return '/change-password';
  if (user.onboardingCompletedAt === null) return '/onboarding';
  return '/dashboard';
}

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  redirect(redirectPathForAuthenticatedUser(session.user));
}
