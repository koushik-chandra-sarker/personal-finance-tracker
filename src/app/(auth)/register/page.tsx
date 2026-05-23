import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import RegisterClient from './RegisterClient';

type RegisterSearchParams = {
  invite?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function redirectPathForAuthenticatedUser(user: { mustChangePassword?: boolean; onboardingCompletedAt?: string | null }) {
  if (user.mustChangePassword) return '/change-password';
  if (user.onboardingCompletedAt === null) return '/onboarding';
  return '/dashboard';
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<RegisterSearchParams>;
}) {
  const session = await auth();
  if (session?.user) redirect(redirectPathForAuthenticatedUser(session.user));

  const resolvedSearchParams = await searchParams;
  return <RegisterClient inviteToken={firstParam(resolvedSearchParams.invite)} />;
}
