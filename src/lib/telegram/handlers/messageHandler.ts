import { TelegramClient } from "telegram";
import { NewMessage } from "telegram/events";
import { EntityLike } from "telegram/define";
import { SendMessageParams } from "telegram/client/messages";
import type { MessageContext, AgentResponse } from "../../../../types";

/**
 * Message handler interface
 */
export interface MessageHandler {
  handle(context: MessageContext): Promise<AgentResponse | null>;
}

/**
 * Split message berdasarkan "!!!" marker yang ditambahkan oleh AI
 * Hanya split berdasarkan "!!!" marker - tidak ada fallback, AI harus handle dengan benar
 */
function splitMessageByMarker(text: string): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  const trimmedText = text.trim();

  // Check apakah ada "!!!" marker
  if (!text.includes("!!!")) {
    // Tidak ada marker - return as-is
    // AI harus sudah menambahkan "!!!" untuk message panjang
    return [trimmedText];
  }

  // Split berdasarkan "!!!" marker
  const chunks = text
    .split("!!!")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  // Jika setelah split hanya ada 1 chunk, berarti tidak ada marker yang valid
  if (chunks.length <= 1) {
    return [trimmedText];
  }

  // Return chunks as-is - AI harus sudah memastikan setiap chunk <= 4000 karakter
  return chunks;
}

/**
 * Safely send a message by resolving the entity in all possible ways.
 * Splits messages based on "!!!" marker added by AI, or sends as-is if no marker.
 */
async function safeSendMessage(
  client: TelegramClient,
  message: any,
  text: string
) {
  try {
    let entity: EntityLike | undefined;

    // 1️⃣ Try to use sender directly (already a full entity if cached)
    if (message.sender) {
      entity = message.sender;
    } else {
      // 2️⃣ Try getInputEntity — safer for IDs or peers
      try {
        entity = await client.getInputEntity(message.senderId);
      } catch {
        // 3️⃣ Try getEntity — if still not found, fetch from Telegram
        try {
          entity = await client.getEntity(message.senderId);
        } catch {
          console.warn(
            "⚠️ Entity not cached, trying to fetch via peer dialog..."
          );
          const dialogs = await client.getDialogs({});
          const found = dialogs.find(
            (d: any) => String(d.entity.id) === String(message.senderId)
          );
          if (found) entity = found.entity;
        }
      }
    }

    if (!entity) {
      console.error(
        "❌ Failed to resolve entity for sender:",
        message.senderId
      );
      return;
    }

    // Split message berdasarkan "!!!" marker dari AI
    const chunks = splitMessageByMarker(text);

    console.log(
      `📤 Sending ${chunks.length} message bubble(s) (total: ${text.length} chars)`
    );

    // Send each chunk as a separate message
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        console.log(
          `📤 Sending bubble ${i + 1}/${chunks.length} (${chunk.length} chars)`
        );
        await client.sendMessage(entity, {
          message: chunk,
        } as SendMessageParams);
        console.log(`✅ Bubble ${i + 1}/${chunks.length} sent successfully`);

        // Small delay between messages to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (chunkError: any) {
        console.error(
          `❌ Failed to send bubble ${i + 1}/${chunks.length}:`,
          chunkError
        );
        // Continue sending remaining chunks even if one fails
        if (chunkError.errorMessage?.includes("MESSAGE_TOO_LONG")) {
          console.warn(
            `⚠️ Bubble ${i + 1} still too long (${
              chunk.length
            } chars), this should not happen!`
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ Failed to send message:", err);
  }
}

/**
 * Creates a message event handler for Telegram client
 */
export function createMessageHandler(
  client: TelegramClient,
  handler: MessageHandler,
  ownerUserId?: string | null
) {
  return client.addEventHandler(async (event) => {
    const message = event.message;
    const text = message.message?.trim();

    // Ignore empty messages and self messages
    if (!text || message.out) return;

    // Check if sender is a bot (to prevent loops between userbots and bot messages)
    let isBot = false;
    try {
      const msgAny = message as any;
      if (msgAny.sender) {
        const sender = msgAny.sender as any;
        if (
          sender.bot === true ||
          (sender._ === "user" && sender.bot === true)
        ) {
          isBot = true;
        }
      }
    } catch (err) {
      // If error checking bot status, continue processing
    }

    if (isBot) {
      console.log(
        `🚫 Ignoring message from bot (senderId: ${message.senderId})`
      );
      return;
    }

    // Ignore messages from other userbots (to prevent loops between userbots)
    if (ownerUserId) {
      const { userbotStore } = await import("../userbotStore");
      const senderIdStr = String(message.senderId || "");
      if (
        userbotStore.hasUserbotRunning(senderIdStr) &&
        senderIdStr !== ownerUserId
      ) {
        console.log(
          `🚫 Ignoring message from another userbot (senderId: ${senderIdStr})`
        );
        return;
      }
    }

    // Ignore messages from groups/channels (only process private chats)
    const chatId = message.chatId;
    if (!chatId) return;

    const chatIdNum =
      typeof chatId === "bigint" ? Number(chatId) : Number(chatId);

    if (chatIdNum <= 0) return;

    // Get sender info (username, firstName, lastName)
    const msgAny = message as any;
    let senderUsername: string | undefined;
    let senderFirstName: string | undefined;
    let senderLastName: string | undefined;

    try {
      if (msgAny.sender) {
        const sender = msgAny.sender as any;

        // Debug: log sender object structure
        console.log("🔍 Sender object keys:", Object.keys(sender));
        console.log("🔍 Sender data:", {
          username: sender.username,
          firstName: sender.firstName,
          first_name: sender.first_name,
          lastName: sender.lastName,
          last_name: sender.last_name,
        });

        // Try both camelCase and snake_case
        senderUsername = sender.username || undefined;
        senderFirstName = sender.firstName || sender.first_name || undefined;
        senderLastName = sender.lastName || sender.last_name || undefined;
      }
    } catch (err) {
      console.error("⚠️ Error getting sender info:", err);
    }

    const context: MessageContext = {
      chatId: String(chatId),
      senderId: String(message.senderId || ""),
      message: text,
      isOutgoing: message.out || false,
      senderUsername,
      senderFirstName,
      senderLastName,
    };

    const senderName = senderFirstName || senderUsername || context.senderId;
    console.log(
      `📩 New private message from ${senderName} (${context.senderId}): ${text}`
    );

    // Check if userbot is enabled for the owner
    if (ownerUserId) {
      try {
        const { prisma } = await import("@/lib/prisma");

        const ownerId = BigInt(parseInt(ownerUserId, 10));
        const user = await prisma.user.findUnique({
          where: { telegramUserId: ownerId },
          select: { userbotEnabled: true },
        });

        if (!user || !user.userbotEnabled) {
          console.log(
            `🚫 Userbot is disabled for owner ${ownerUserId}, ignoring message`
          );
          return;
        }
      } catch (err) {
        console.error("⚠️ Error checking userbot status:", err);
        // Continue processing if check fails
      }
    }

    try {
      const response = await handler.handle(context);

      if (response?.content) {
        console.log(`💬 Replying with ${response.content.length} characters`);
        console.log(
          `💬 First 200 chars: ${response.content.substring(0, 200)}...`
        );
        await safeSendMessage(client, message, response.content);
      } else {
        console.warn("⚠️ No response content from handler");
      }
    } catch (err) {
      console.error("❌ Error handling message:", err);
    }
  }, new NewMessage({ incoming: true }));
}
