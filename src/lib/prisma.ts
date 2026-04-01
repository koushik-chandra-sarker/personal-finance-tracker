import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
};

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        const start = performance.now();
        const result = await query(args);
        const end = performance.now();
        const time = (end - start).toFixed(2);
        
        console.log(
          `\x1b[36m[Prisma Query]\x1b[0m ${model ? model + '.' : ''}${operation} took \x1b[33m${time}ms\x1b[0m`
        );
        return result;
      },
    },
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
