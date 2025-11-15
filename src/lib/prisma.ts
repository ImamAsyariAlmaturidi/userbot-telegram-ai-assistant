import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 *
 * Prevents multiple instances of PrismaClient in development
 * and ensures connection pooling works correctly in production.
 *
 * In Next.js, each module import can create a new instance,
 * so we use a global variable to store the client instance.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
