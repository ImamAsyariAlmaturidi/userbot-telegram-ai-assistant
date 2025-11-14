import { createServerClient } from "@/lib/supabase/client";

/**
 * Get custom prompt for a user from database
 * Returns null if no custom prompt is set (will use default)
 */
export async function getCustomPrompt(
  telegramUserId: number | string
): Promise<string | null> {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      // Supabase not configured, return null to use default prompt
      console.log(
        "[getCustomPrompt] Supabase not configured, using default prompt"
      );
      return null;
    }

    // Ensure we have a valid number
    const userId =
      typeof telegramUserId === "string"
        ? parseInt(telegramUserId, 10)
        : Number(telegramUserId);

    if (isNaN(userId)) {
      console.error(
        `[getCustomPrompt] Invalid telegram_user_id: ${telegramUserId}`
      );
      return null;
    }

    console.log(
      `[getCustomPrompt] Fetching prompt for telegram_user_id: ${userId} (original: ${telegramUserId}, type: ${typeof telegramUserId})`
    );

    const { data, error } = await supabase
      .from("users")
      .select("custom_prompt")
      .eq("telegram_user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - user not found
        console.log(
          `[getCustomPrompt] No custom prompt found for user ${userId}, using default`
        );
        return null;
      }
      console.error("[getCustomPrompt] Error fetching custom prompt:", error);
      return null;
    }

    if (data?.custom_prompt) {
      console.log(
        `[getCustomPrompt] Found custom prompt for user ${userId} (length: ${data.custom_prompt.length})`
      );
      return data.custom_prompt;
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
