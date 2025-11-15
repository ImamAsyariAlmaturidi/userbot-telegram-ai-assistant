import { prisma } from "@/lib/prisma";

/**
 * Get custom prompt for a user from database
 * Returns null if no custom prompt is set (will use default)
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

    console.log(
      `[getCustomPrompt] Fetching prompt for telegram_user_id: ${userId}`
    );

    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { customPrompt: true },
    });

    if (!user) {
      console.log(
        `[getCustomPrompt] User not found for ${userId}, using default prompt`
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
