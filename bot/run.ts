#!/usr/bin/env bun

/**
 * Standalone Userbot Worker
 *
 * Runs userbot as a separate process, independent from Next.js
 * This prevents issues with:
 * - Next.js hot reload restarting userbot
 * - Server restart causing connection drops
 * - ECONNRESET errors from reconnection bursts
 */

import { startUserbot } from "../src/lib/telegram/userbot";
import { prisma } from "../src/lib/prisma";
import { AIMessageHandler } from "../src/lib/telegram/handlers/aiMessageHandler";

// Track running userbots
const runningUserbots = new Map<string, any>();

/**
 * Start userbot for a specific user
 */
async function startUserbotForUser(sessionString: string, ownerUserId: string) {
  try {
    console.log(`🚀 Starting userbot for user: ${ownerUserId}`);

    const client = await startUserbot({
      sessionString,
      handler: new AIMessageHandler(ownerUserId),
    });

    runningUserbots.set(ownerUserId, client);
    console.log(`✅ Userbot started successfully for user: ${ownerUserId}`);

    return client;
  } catch (error: any) {
    console.error(
      `❌ Failed to start userbot for user ${ownerUserId}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Load all enabled userbots from database and start them
 */
async function loadAndStartUserbots() {
  try {
    console.log("📋 Loading enabled userbots from database...");

    const users = await prisma.user.findMany({
      where: {
        userbotEnabled: true,
      },
      select: {
        telegramUserId: true,
        session: true,
      },
    });

    // Filter out users without session
    const usersWithSession = users.filter((u) => u.session !== null);

    console.log(
      `📊 Found ${usersWithSession.length} enabled user(s) with session`
    );

    if (usersWithSession.length === 0) {
      console.log(
        "⚠️  No enabled userbots found. Waiting for users to enable userbot..."
      );
      return;
    }

    // Start userbot for each enabled user
    for (const user of usersWithSession) {
      const ownerUserId = String(user.telegramUserId);
      const sessionString = user.session as string;

      if (!sessionString) {
        console.warn(`⚠️  User ${ownerUserId} has no session, skipping...`);
        continue;
      }

      // Skip if already running
      if (runningUserbots.has(ownerUserId)) {
        console.log(`⏭️  Userbot already running for user: ${ownerUserId}`);
        continue;
      }

      try {
        await startUserbotForUser(sessionString, ownerUserId);
      } catch (error) {
        console.error(
          `❌ Failed to start userbot for user ${ownerUserId}:`,
          error
        );
        // Continue with other users
      }
    }
  } catch (error) {
    console.error("❌ Error loading userbots:", error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log("\n🛑 Shutting down userbot worker...");

  for (const [userId, client] of runningUserbots.entries()) {
    try {
      if (client && client.connected) {
        await client.disconnect();
        console.log(`✅ Disconnected userbot for user: ${userId}`);
      }
    } catch (error) {
      console.error(
        `❌ Error disconnecting userbot for user ${userId}:`,
        error
      );
    }
  }

  await prisma.$disconnect();
  console.log("👋 Userbot worker stopped");
  process.exit(0);
}

/**
 * Watch for userbot status changes in database
 * Poll every 30 seconds to check for new enabled userbots
 */
async function watchUserbotStatus() {
  setInterval(async () => {
    try {
      const users = await prisma.user.findMany({
        where: {
          userbotEnabled: true,
        },
        select: {
          telegramUserId: true,
          session: true,
        },
      });

      // Filter out users without session
      const usersWithSession = users.filter((u) => u.session !== null);

      // Start userbots that are not running yet
      for (const user of usersWithSession) {
        const ownerUserId = String(user.telegramUserId);
        const sessionString = user.session as string;

        if (!sessionString) continue;
        if (runningUserbots.has(ownerUserId)) continue;

        try {
          await startUserbotForUser(sessionString, ownerUserId);
        } catch (error) {
          console.error(
            `❌ Failed to start userbot for user ${ownerUserId}:`,
            error
          );
        }
      }

      // Stop userbots that are disabled
      for (const [userId] of runningUserbots.entries()) {
        const user = await prisma.user.findUnique({
          where: { telegramUserId: BigInt(userId) },
          select: { userbotEnabled: true },
        });

        if (!user || !user.userbotEnabled) {
          console.log(`🛑 Stopping disabled userbot for user: ${userId}`);
          const client = runningUserbots.get(userId);
          if (client && client.connected) {
            await client.disconnect();
          }
          runningUserbots.delete(userId);
        }
      }
    } catch (error) {
      console.error("❌ Error watching userbot status:", error);
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Main entry point
 */
async function main() {
  console.log("🤖 Starting Userbot Worker...");
  console.log("=".repeat(50));

  // Load environment variables
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  if (!process.env.TG_API_ID || !process.env.TG_API_HASH) {
    console.error("❌ TG_API_ID and TG_API_HASH are required");
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught exception:", error);
    shutdown();
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
  });

  try {
    // Load and start all enabled userbots
    await loadAndStartUserbots();

    // Start watching for status changes
    watchUserbotStatus();

    console.log("=".repeat(50));
    console.log("✅ Userbot Worker is running!");
    console.log("📡 Monitoring for new enabled userbots...");
    console.log("Press Ctrl+C to stop");
  } catch (error) {
    console.error("❌ Failed to start userbot worker:", error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
