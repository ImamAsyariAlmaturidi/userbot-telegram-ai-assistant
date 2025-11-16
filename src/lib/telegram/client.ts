import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { LogLevel } from "telegram/extensions/Logger";
import type { TelegramConfig, ClientConfig } from "../../../types";

/**
 * Creates a Telegram client instance
 */
export function createTelegramClient(
  config: TelegramConfig,
  clientConfig?: ClientConfig
): TelegramClient {
  const {
    connectionRetries = 5, // Increase retries for better reliability
    retryDelay = 1000, // Increase delay to 1 second
    requestRetries = 3, // Increase request retries
    autoReconnect = true,
    useWSS = true,
    useIPV6 = false,
    testServers = false,
  } = clientConfig || {};

  // Validasi session string sebelum membuat StringSession
  // Untuk user baru yang belum login, sessionString bisa empty string (untuk membuat session baru)
  const sessionString = config.sessionString || "";

  // Jika sessionString tidak empty, harus valid (minimal 10 karakter)
  // Jika empty, kita buat session baru (untuk sendCode pada user baru)
  if (sessionString && sessionString.trim().length > 0) {
    if (typeof sessionString !== "string" || sessionString.trim().length < 10) {
      throw new Error(
        "Invalid session string format. Session must be a non-empty string with valid format."
      );
    }
  }

  // StringSession bisa dibuat dengan empty string untuk session baru
  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries,
    retryDelay,
    requestRetries,
    autoReconnect,
    useWSS,
    useIPV6,
    testServers,
  });

  client.setLogLevel(LogLevel.ERROR);
  return client;
}

/**
 * Creates a Telegram client from environment variables
 * Untuk user baru yang belum punya session, bisa pass undefined atau empty string
 */
export function createClientFromEnv(sessionString?: string): TelegramClient {
  const apiId = Number(process.env.TG_API_ID);
  const apiHash = process.env.TG_API_HASH;

  if (!apiId || !apiHash) {
    throw new Error("Missing TG_API_ID / TG_API_HASH in environment variables");
  }

  // Jika sessionString undefined atau empty, gunakan empty string untuk membuat session baru
  // Ini diperlukan untuk sendCode pada user baru
  const finalSessionString =
    sessionString || process.env.TG_SESSION_STRING || "";

  return createTelegramClient({
    apiId,
    apiHash,
    sessionString: finalSessionString,
  });
}
