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
    connectionRetries = 3,
    retryDelay = 500,
    requestRetries = 2,
    autoReconnect = true,
    useWSS = true,
    useIPV6 = false,
    testServers = false,
  } = clientConfig || {};

  const session = new StringSession(config.sessionString || "");
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
 */
export function createClientFromEnv(sessionString?: string): TelegramClient {
  const apiId = Number(process.env.TG_API_ID);
  const apiHash = process.env.TG_API_HASH;

  if (!apiId || !apiHash) {
    throw new Error("Missing TG_API_ID / TG_API_HASH in environment variables");
  }

  return createTelegramClient({
    apiId,
    apiHash,
    sessionString: sessionString || process.env.TG_SESSION_STRING,
  });
}
