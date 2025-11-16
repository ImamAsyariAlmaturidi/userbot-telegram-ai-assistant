import { TelegramClient } from "telegram";
import { createClientFromEnv } from "./client";
import { createMessageHandler } from "./handlers/messageHandler";
import { AIMessageHandler } from "./handlers/aiMessageHandler";
import { userbotStore } from "./userbotStore";
import type { MessageHandler } from "./handlers/messageHandler";

/**
 * Userbot configuration
 */
export interface UserbotConfig {
  sessionString?: string;
  handler?: MessageHandler;
}

/**
 * Validasi session string format
 */
function isValidSessionString(
  sessionString: string | null | undefined
): boolean {
  if (!sessionString || typeof sessionString !== "string") {
    return false;
  }

  // Session string tidak boleh kosong
  if (sessionString.trim().length === 0) {
    return false;
  }

  // Session string Telegram biasanya panjang (minimal 10 karakter)
  if (sessionString.trim().length < 10) {
    return false;
  }

  return true;
}

/**
 * Start the Telegram userbot
 */
export async function startUserbot(
  config?: UserbotConfig
): Promise<TelegramClient> {
  const sessionString = config?.sessionString || process.env.TG_SESSION_STRING;

  if (!sessionString) {
    throw new Error("Session string is required. Please login first.");
  }

  // Validasi format session string sebelum membuat client
  if (!isValidSessionString(sessionString)) {
    throw new Error(
      "Invalid session string format. Session must be a non-empty string with valid format."
    );
  }

  // Check if already running
  if (userbotStore.has(sessionString)) {
    const existingClient = userbotStore.get(sessionString);
    if (existingClient && existingClient.connected) {
      console.log("🤖 Userbot is already running for this session");
      return existingClient;
    } else {
      // Remove disconnected client
      await userbotStore.remove(sessionString);
    }
  }

  const client = createClientFromEnv(sessionString);

  await client.connect();

  if (!(await client.isUserAuthorized())) {
    await client.disconnect();
    throw new Error("Not logged in. Provide a valid session string.");
  }

  // Get the logged in user's ID (owner of the userbot)
  const me = await client.getMe();
  const ownerUserId = me?.id ? String(me.id) : null;

  if (ownerUserId) {
    console.log(`🤖 Telegram AI userbot is running for user: ${ownerUserId}`);
  } else {
    console.log("🤖 Telegram AI userbot is running...");
  }

  // Use provided handler or default AI handler with owner user ID
  const handler = config?.handler || new AIMessageHandler(ownerUserId);
  createMessageHandler(client, handler, ownerUserId);

  // Store client with user ID
  userbotStore.set(sessionString, client, ownerUserId || undefined);

  return client;
}

/**
 * Stop userbot for specific session
 */
export async function stopUserbot(sessionString: string): Promise<void> {
  await userbotStore.remove(sessionString);
}
