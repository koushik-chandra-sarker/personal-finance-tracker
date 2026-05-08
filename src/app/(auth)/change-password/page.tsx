import ChangePasswordRequiredClient from '@/components/auth/ChangePasswordRequiredClient';

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ChangePasswordRequiredClient searchParams={resolvedSearchParams} />;
}
