import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton with optimized connection pooling
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
    // Connection pooling is handled by DATABASE_URL
    // For Supabase, use the pooler URL (port 6543) instead of direct connection
    // Make sure DATABASE_URL uses connection pooling: ?pgbouncer=true&connection_limit=10
  });

// Add connection error handling
prisma.$on("error" as never, (e: any) => {
  console.error("[Prisma] Database error:", e);
});

// Graceful shutdown
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Cleanup on process exit
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
