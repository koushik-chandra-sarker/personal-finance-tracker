import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type RuntimePrismaClient = PrismaClient & {
  _runtimeDataModel?: {
    models?: Record<string, { fields?: Array<{ name?: string }> }>;
  };
};

function hasCurrentPrismaDelegates(client: PrismaClient | undefined) {
  const runtimeClient = client as RuntimePrismaClient | undefined;
  const tutorialFields = runtimeClient?._runtimeDataModel?.models?.Tutorial?.fields;
  const hasTutorialPremiumFlag = tutorialFields?.some((field) => field.name === 'isPremium') ?? false;
  const hasAdminMessageModel = Boolean(runtimeClient?._runtimeDataModel?.models?.AdminMessage);
  const hasManualPaymentModel = Boolean(runtimeClient?._runtimeDataModel?.models?.ManualPaymentRequest);

  return Boolean(
    client &&
    'investmentCashflow' in client &&
    'pageView' in client &&
    'userActivity' in client &&
    hasTutorialPremiumFlag &&
    hasAdminMessageModel &&
    hasManualPaymentModel
  );
}

// During next dev, Prisma can be regenerated while the old client instance is
// still cached on globalThis. Replace that stale instance after schema changes.
export const prisma = hasCurrentPrismaDelegates(globalForPrisma.prisma) ? globalForPrisma.prisma! : new PrismaClient({
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
});
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
