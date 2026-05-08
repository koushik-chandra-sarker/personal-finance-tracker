import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function hasCurrentPrismaDelegates(client: PrismaClient | undefined) {
  return Boolean(client && 'investmentCashflow' in client && 'pageView' in client && 'userActivity' in client);
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
