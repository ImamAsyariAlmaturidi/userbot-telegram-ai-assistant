import { TelegramClient } from "telegram";
import { NewMessage } from "telegram/events";
import { EntityLike } from "telegram/define";
import { SendMessageParams } from "telegram/client/messages";
import type { MessageContext, AgentResponse } from "../../../../types";

/** Message handler interface */
export interface MessageHandler {
  handle(context: MessageContext): Promise<AgentResponse | null>;
}
async function resolveEntity(client: TelegramClient, message: any) {
  // 1. Kalo sender udah ada → langsung return
  if (message.sender) return message.sender;

  const rawId = message.senderId;
  if (!rawId) return null;

  // 2. Normalize BIGINT → number/string
  let normalized: any = rawId;

  if (typeof rawId === "bigint") {
    normalized = Number(rawId);
  }

  if (typeof rawId === "object" && rawId._ === "peerUser") {
    normalized = rawId.userId;
  }

  // 3. Try getInputEntity (paling aman)
  try {
    return await client.getInputEntity(normalized);
  } catch {}

  // 4. Try getEntity (kadang sukses kalo penuh)
  try {
    return await client.getEntity(normalized);
  } catch {}

  // 5. Last fallback: scan dialog
  try {
    const dialogs = await client.getDialogs({});
    const found = dialogs.find(
      (d: any) => String(d.entity?.id) === String(normalized)
    );
    if (found) return found.entity;
  } catch {}

  return null;
}

/** Split AI output by !!! marker */
function splitMessageByMarker(text: string): string[] {
  if (!text) return [];
  if (!text.includes("!!!")) return [text.trim()];

  const chunks = text
    .split("!!!")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  return chunks.length <= 1 ? [text.trim()] : chunks;
}

/** Send safely + chunking */
async function safeSendMessage(
  client: TelegramClient,
  message: any,
  text: string
) {
  try {
    let entity: EntityLike | undefined;

    if (message.sender) {
      entity = message.sender;
    }

    if (!entity) {
      try {
        entity = await client.getInputEntity(message.senderId);
      } catch {
        try {
          entity = await client.getEntity(message.senderId);
        } catch {
          const dialogs = await client.getDialogs({});
          const found = dialogs.find(
            (d: any) => String(d.entity.id) === String(message.senderId)
          );
          if (found) entity = found.entity;
        }
      }
    }

    if (!entity) {
      console.error("Failed to resolve entity", message.senderId);
      return;
    }

    const chunks = splitMessageByMarker(text);
    for (let i = 0; i < chunks.length; i++) {
      try {
        await client.sendMessage(entity, {
          message: chunks[i],
        } as SendMessageParams);

        if (i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (err) {
        console.error("Bubble failed:", err);
      }
    }
  } catch (err) {
    console.error("Send failed:", err);
  }
}

/** Main message handler creator */
export function createMessageHandler(
  client: TelegramClient,
  handler: MessageHandler,
  ownerUserId?: string | null
) {
  return client.addEventHandler(async (event) => {
    const message = event.message;
    const text = message.message?.trim();

    // ignore self / kosong
    if (!text || message.out) return;

    /** BLOCK BOT SENDER */
    try {
      const s = (message as any).sender;
      if (s && (s.bot === true || (s._ === "user" && s.bot === true))) {
        return;
      }
    } catch {}

    /** IGNORE OTHER USERBOT LOOP */
    if (ownerUserId) {
      const { userbotStore } = await import("../userbotStore");
      const sid = String(message.senderId || "");
      if (userbotStore.hasUserbotRunning(sid) && sid !== ownerUserId) return;
    }

    /** Only handle private chat */
    const chatId = message.chatId;
    if (!chatId) return;

    const cid = typeof chatId === "bigint" ? Number(chatId) : Number(chatId);
    if (cid <= 0) return;

    /** Fetch sender info (FULL PROFILE FIX) */
    let senderEntity: any = null;

    try {
      senderEntity = await resolveEntity(client, message);
    } catch {
      senderEntity = (message as any).sender || null;
    }

    const senderUsername =
      senderEntity?.username || senderEntity?.usernames?.[0]?.username;
    const senderFirstName = senderEntity?.firstName || senderEntity?.first_name;
    const senderLastName = senderEntity?.lastName || senderEntity?.last_name;

    // Log sender payload for debugging
    console.log(
      `📩 New private message from ${message.senderId} (${
        senderFirstName || ""
      } ${senderLastName || ""}${
        senderUsername ? ` @${senderUsername}` : ""
      }): ${text?.substring(0, 100)}${text && text.length > 100 ? "..." : ""}`
    );
    console.log(
      `[MessageHandler] Sender payload:`,
      JSON.stringify(
        {
          senderId: String(message.senderId || ""),
          username: senderUsername || null,
          firstName: senderFirstName || null,
          lastName: senderLastName || null,
          chatId: String(chatId),
          messageLength: text?.length || 0,
        },
        null,
        2
      )
    );

    // Log full senderEntity for detailed debugging (if available)
    if (senderEntity) {
      console.log(
        `[MessageHandler] Full senderEntity:`,
        JSON.stringify(
          {
            id: senderEntity?.id ? String(senderEntity.id) : null,
            _: senderEntity?._ || null,
            username: senderEntity?.username || null,
            usernames: senderEntity?.usernames || null,
            firstName:
              senderEntity?.firstName || senderEntity?.first_name || null,
            lastName: senderEntity?.lastName || senderEntity?.last_name || null,
            phone: senderEntity?.phone || null,
            bot: senderEntity?.bot || null,
            verified: senderEntity?.verified || null,
            premium: senderEntity?.premium || null,
          },
          null,
          2
        )
      );
    }

    const context: MessageContext = {
      chatId: String(chatId),
      senderId: String(message.senderId || ""),
      message: text,
      isOutgoing: false,
      senderUsername,
      senderFirstName,
      senderLastName,
    };

    /** Userbot enable check */
    if (ownerUserId) {
      try {
        const { prisma } = await import("@/lib/prisma");
        const { retryPrismaOperation } = await import("@/lib/prisma/retry");

        const ownerId = BigInt(parseInt(ownerUserId, 10));
        const user = await retryPrismaOperation(
          () =>
            prisma.user.findUnique({
              where: { telegramUserId: ownerId },
              select: { userbotEnabled: true },
            }),
          {
            maxRetries: 1,
            retryDelay: 500,
          }
        );

        if (!user?.userbotEnabled) return;
      } catch (err: any) {
        // Database connection error - continue processing if it's a connection issue
        // This allows the bot to keep working even if database is temporarily unavailable
        if (err?.code === "P1001" || err?.code === "P1017") {
          console.warn(
            "[MessageHandler] Database connection error after retries, continuing without userbot toggle check:",
            err?.code
          );
          // Continue processing - assume userbot is enabled if we can't check
        } else {
          console.error("Userbot toggle check failed:", err);
          // For other errors, also continue to avoid blocking messages
        }
      }
    }

    /** Process */
    try {
      const response = await handler.handle(context);
      if (response?.content) {
        await safeSendMessage(client, message, response.content);
      }
    } catch (err) {
      console.error("Handler error:", err);
    }
  }, new NewMessage({ incoming: true }));
}
