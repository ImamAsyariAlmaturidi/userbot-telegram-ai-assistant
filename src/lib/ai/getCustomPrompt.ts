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

    const user = await prisma.user.findUnique({
      where: { telegramUserId: userId },
      select: { customPrompt: true },
    });

    if (!user || !user.customPrompt) {
      return null;
    }

    return user.customPrompt;
  } catch (error) {
    console.error("[getCustomPrompt] Error in getCustomPrompt:", error);
    return null;
  }
}
