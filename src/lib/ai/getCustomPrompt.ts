import { prisma } from "@/lib/prisma";

/**
 * Get custom prompt for a user from database
 * Returns null if no custom prompt is set (will use default)
 */
export async function getCustomPrompt(
  telegramUserId: number | string
): Promise<string | null> {
  try {
    // Ensure we have a valid number
    const userId =
      typeof telegramUserId === "string"
        ? BigInt(parseInt(telegramUserId, 10))
        : BigInt(telegramUserId);

    if (isNaN(Number(userId))) {
      console.error(
        `[getCustomPrompt] Invalid telegram_user_id: ${telegramUserId}`
      );
      return null;
    }

    console.log(
      `[getCustomPrompt] Fetching prompt for telegram_user_id: ${userId} (original: ${telegramUserId}, type: ${typeof telegramUserId})`
    );

    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { customPrompt: true },
    });

    if (!user) {
      console.log(
        `[getCustomPrompt] No custom prompt found for user ${userId}, using default`
      );
      return null;
    }

    if (user.customPrompt) {
      console.log(
        `[getCustomPrompt] Found custom prompt for user ${userId} (length: ${user.customPrompt.length})`
      );
      return user.customPrompt;
    }

    console.log(
      `[getCustomPrompt] No custom prompt set for user ${userId}, using default`
    );
    return null;
  } catch (error) {
    console.error("[getCustomPrompt] Error in getCustomPrompt:", error);
    return null;
  }
}
