import { prisma } from "@/lib/prisma";
import { retryPrismaOperation } from "@/lib/prisma/retry";

/**
 * Get custom prompt for a user from database
 * Returns null if no custom prompt is set (will use default)
 * Uses retry mechanism for connection errors
 */
export async function getCustomPrompt(
  telegramUserId: number | string | bigint
): Promise<string | null> {
  try {
    // Ensure we have a valid BigInt
    let userId: bigint;
    if (typeof telegramUserId === "bigint") {
      userId = telegramUserId;
    } else if (typeof telegramUserId === "string") {
      userId = BigInt(parseInt(telegramUserId, 10));
    } else {
      userId = BigInt(telegramUserId);
    }

    // Use retry mechanism for connection errors
    const user = await retryPrismaOperation(
      () =>
        prisma.user.findUnique({
          where: { telegramUserId: userId },
          select: { customPrompt: true },
        }),
      {
        maxRetries: 2,
        retryDelay: 500,
      }
    );

    if (!user || !user.customPrompt) {
      return null;
    }

    return user.customPrompt;
  } catch (error: any) {
    // Database connection error - return null to use default prompt
    // This allows the bot to keep working even if database is temporarily unavailable
    if (error?.code === "P1001" || error?.code === "P1017") {
      console.warn(
        "[getCustomPrompt] Database connection error after retries, using default prompt:",
        error?.code
      );
    } else {
      console.error("[getCustomPrompt] Error in getCustomPrompt:", error);
    }
    return null; // Return null to use default prompt
  }
}
