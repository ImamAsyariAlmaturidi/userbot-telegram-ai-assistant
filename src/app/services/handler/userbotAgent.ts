/**
 * @deprecated This file is kept for backward compatibility
 * Please use lib/telegram/userbot.ts instead
 */

import { startUserbot } from "@/lib/telegram/userbot";

/**
 * Start the Telegram userbot
 * This is a wrapper for backward compatibility
 */
export default async function startBot(sessionString: string) {
  return startUserbot({ sessionString: sessionString as unknown as string });
}
