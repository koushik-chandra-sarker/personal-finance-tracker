import RegisterClient from './RegisterClient';

type RegisterSearchParams = {
  invite?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<RegisterSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <RegisterClient inviteToken={firstParam(resolvedSearchParams.invite)} />;
}
