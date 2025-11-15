#!/usr/bin/env bun

/**
 * Standalone Userbot Worker
 *
 * Runs userbot as a separate process, independent from Next.js.
 * Cocok untuk:
 * - Render Web Service (FREE tier) dengan health check HTTP
 * - Multi-user userbot: satu session per user
 */

import http from "http";
import { startUserbot } from "../src/lib/telegram/userbot";
import { prisma } from "../src/lib/prisma";
import { AIMessageHandler } from "../src/lib/telegram/handlers/aiMessageHandler";

// Simpan client yang sedang jalan: key = telegramUserId (string)
type UserbotClient = any;
const runningUserbots = new Map<string, UserbotClient>();

// Config retry
const MAX_START_RETRIES = 3;
const RETRY_DELAY_MS = 5_000; // 5 detik

/**
 * Utility kecil: delay
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start userbot untuk 1 user dengan retry sederhana
 */
async function startUserbotForUser(
  sessionString: string,
  ownerUserId: string
): Promise<UserbotClient | null> {
  let attempt = 0;
  while (attempt < MAX_START_RETRIES) {
    attempt += 1;
    try {
      console.log(
        `🚀 [${ownerUserId}] Starting userbot (attempt ${attempt}/${MAX_START_RETRIES})`
      );

      const client = await startUserbot({
        sessionString,
        handler: new AIMessageHandler(ownerUserId),
      });

      runningUserbots.set(ownerUserId, client);
      console.log(`✅ [${ownerUserId}] Userbot started successfully`);

      return client;
    } catch (error: any) {
      console.error(
        `❌ [${ownerUserId}] Failed to start userbot (attempt ${attempt}):`,
        error?.message ?? error
      );

      if (attempt >= MAX_START_RETRIES) {
        console.error(
          `🛑 [${ownerUserId}] Reached max retries, giving up for now`
        );
        return null;
      }

      console.log(
        `⏳ [${ownerUserId}] Retrying in ${Math.round(
          RETRY_DELAY_MS / 1000
        )}s...`
      );
      await sleep(RETRY_DELAY_MS);
    }
  }

  return null;
}

/**
 * Ambil semua user yang userbotEnabled=true dan punya session
 */
async function getEnabledUsersWithSession() {
  const users = await prisma.user.findMany({
    where: {
      userbotEnabled: true,
    },
    select: {
      telegramUserId: true,
      session: true,
    },
  });

  const usersWithSession = users.filter(
    (u: { telegramUserId: bigint; session: string | null }) =>
      u.session !== null
  );

  return usersWithSession;
}

/**
 * Load & start semua userbot yang enabled
 */
async function loadAndStartUserbots() {
  console.log("📋 Loading enabled userbots from database...");

  const usersWithSession = await getEnabledUsersWithSession();

  console.log(
    `📊 Found ${usersWithSession.length} enabled user(s) with session`
  );

  if (usersWithSession.length === 0) {
    console.log(
      "⚠️  No enabled userbots found. Waiting for users to enable userbot..."
    );
    return;
  }

  for (const user of usersWithSession) {
    const ownerUserId = String(user.telegramUserId);
    const sessionString = user.session as string;

    if (!sessionString) {
      console.warn(`⚠️  [${ownerUserId}] No session, skipping...`);
      continue;
    }

    if (runningUserbots.has(ownerUserId)) {
      console.log(`⏭️  [${ownerUserId}] Userbot already running, skipping`);
      continue;
    }

    await startUserbotForUser(sessionString, ownerUserId);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log("\n🛑 Shutting down userbot worker...");

  // Stop semua userbot
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

  runningUserbots.clear();

  // Disconnect Prisma
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.error("❌ Error disconnecting Prisma:", err);
  }

  console.log("👋 Userbot worker stopped");
  process.exit(0);
}

/**
 * Watch status userbot:
 * - Start userbot baru kalau ada user enabled+punya session
 * - Stop userbot yang di-disable
 * - Restart userbot yang disconnect
 */
async function watchUserbotStatus() {
  const intervalMs = 30_000; // 30 detik

  setInterval(async () => {
    try {
      const usersWithSession = await getEnabledUsersWithSession();

      const enabledIds = new Set(
        usersWithSession.map((u) => String(u.telegramUserId))
      );

      // 1) Start userbot untuk user enabled yang belum jalan
      for (const user of usersWithSession) {
        const ownerUserId = String(user.telegramUserId);
        const sessionString = user.session as string;

        const existingClient = runningUserbots.get(ownerUserId);

        // Kalau belum ada client → start
        if (!existingClient) {
          await startUserbotForUser(sessionString, ownerUserId);
          continue;
        }

        // Kalau ada client tapi kelihatan tidak connected → restart
        if (!existingClient.connected) {
          console.warn(
            `⚠️ [${ownerUserId}] Client not connected, restarting userbot...`
          );

          try {
            await existingClient.disconnect().catch(() => undefined);
          } catch {
            // ignore error disconnect
          }

          runningUserbots.delete(ownerUserId);
          await startUserbotForUser(sessionString, ownerUserId);
        }
      }

      // 2) Stop userbot yang sekarang sudah tidak enabled
      for (const [userId, client] of runningUserbots.entries()) {
        if (!enabledIds.has(userId)) {
          console.log(`🛑 Stopping disabled userbot for user: ${userId}`);
          try {
            if (client && client.connected) {
              await client.disconnect();
            }
          } catch (err) {
            console.error(
              `❌ Error disconnecting disabled userbot for user ${userId}:`,
              err
            );
          }
          runningUserbots.delete(userId);
        }
      }
    } catch (error) {
      console.error("❌ Error watching userbot status:", error);
    }
  }, intervalMs);
}

/**
 * HTTP server untuk health check (WAJIB di Render Web Service)
 */
function startHealthCheckServer() {
  const port = Number(process.env.PORT || 3001);

  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const status = {
        status: "ok",
        service: "userbot-worker",
        timestamp: new Date().toISOString(),
        runningUserbots: runningUserbots.size,
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status, null, 2));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`🌐 Health check server listening on port ${port}`);
    console.log(`   Health endpoint: http://0.0.0.0:${port}/health`);
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  console.log("🤖 Starting Userbot Worker...");
  console.log("=".repeat(50));

  // Validasi env
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  if (!process.env.TG_API_ID || !process.env.TG_API_HASH) {
    console.error("❌ TG_API_ID and TG_API_HASH are required");
    process.exit(1);
  }

  const healthServer = startHealthCheckServer();

  // Graceful shutdown handler
  const handleExit = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down...`);
    healthServer.close();
    await shutdown();
  };

  process.on("SIGINT", () => {
    void handleExit("SIGINT");
  });

  process.on("SIGTERM", () => {
    void handleExit("SIGTERM");
  });

  // Error handling global
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught exception:", error);
    // Jangan langsung exit brutal, coba shutdown rapi
    void shutdown();
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
  });

  try {
    // Start semua userbot yang enabled
    await loadAndStartUserbots();

    // Watch perubahan status di DB
    await watchUserbotStatus();

    console.log("=".repeat(50));
    console.log("✅ Userbot Worker is running!");
    console.log("📡 Monitoring for new enabled/disabled userbots...");
  } catch (error) {
    console.error("❌ Failed to start userbot worker:", error);
    healthServer.close();
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
