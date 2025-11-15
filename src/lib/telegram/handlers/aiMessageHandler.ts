import type { MessageHandler } from "./messageHandler";
import type { MessageContext, AgentResponse } from "../../../../types";
import { createUserbotAgent } from "../../../lib/ai/agent";
import { getCustomPrompt } from "../../../lib/ai/getCustomPrompt";
import { run } from "@openai/agents";
/**
 * AI-powered message handler
 * Uses LangChain agent to process and respond to messages
 * Supports custom prompts per user from database
 * Uses the owner's (logged in user) custom prompt, not the sender's
 */
export class AIMessageHandler implements MessageHandler {
  private ownerUserId: string | null;

  constructor(ownerUserId?: string | null) {
    this.ownerUserId = ownerUserId || null;
  }

  async handle(context: MessageContext): Promise<AgentResponse | null> {
    try {
      // Get custom prompt for the owner (logged in user), not the sender
      // IMPORTANT: Selalu ambil dari database setiap kali handle message
      // Ini memastikan prompt/knowledge source terbaru selalu digunakan
      const userIdToUse = this.ownerUserId || context.senderId;
      console.log(
        `[AIMessageHandler] Handling message from senderId: ${
          context.senderId
        }, using owner prompt: ${this.ownerUserId || "not set"}`
      );

      const customPrompt = await getCustomPrompt(userIdToUse);

      // Build comprehensive context message with sender info
      let senderContext = "📋 INFORMASI USER YANG MENGIRIM PESAN:\n";

      // Build full name
      const fullName = [context.senderFirstName, context.senderLastName]
        .filter(Boolean)
        .join(" ");
      if (fullName) {
        senderContext += `- Nama Lengkap: ${fullName}\n`;
      } else if (context.senderFirstName) {
        senderContext += `- Nama: ${context.senderFirstName}\n`;
      }

      if (context.senderUsername) {
        senderContext += `- Username: @${context.senderUsername}\n`;
      }

      senderContext += `- Telegram ID: ${context.senderId}\n`;

      // Add instruction for AI to use this context
      senderContext += `\n💡 INSTRUKSI: Gunakan informasi user di atas untuk personalisasi respons. Sapa user dengan nama mereka jika tersedia. Referensi user dengan nama atau username mereka saat merespons.\n`;

      const contextMessage = `${senderContext}\n---\n\nPESAN DARI USER:\n${context.message}`;

      const senderName =
        context.senderFirstName || context.senderUsername || "User";

      // Build context log without "?" placeholders
      const contextParts: string[] = [];
      if (context.senderFirstName) contextParts.push(context.senderFirstName);
      if (context.senderLastName) contextParts.push(context.senderLastName);
      const namePart = contextParts.length > 0 ? contextParts.join(" ") : "";
      const usernamePart = context.senderUsername
        ? `@${context.senderUsername}`
        : "";
      const contextLog =
        [namePart, usernamePart].filter(Boolean).join(" ") || "Unknown";
      console.log(`[AIMessageHandler] Context: ${contextLog}`);

      // Create agent with custom prompt or use default - pass all user info
      const userContext = {
        firstName: context.senderFirstName,
        lastName: context.senderLastName,
        username: context.senderUsername,
        userId: String(context.senderId),
      };
      const agent = createUserbotAgent(customPrompt || undefined, userContext);

      // Add timeout untuk prevent infinite loop (max 60 detik)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(new Error("TIMEOUT: Agent execution exceeded 60 seconds")),
          60000
        );
      });

      const response = await Promise.race([
        run(agent, contextMessage),
        timeoutPromise,
      ]);

      return {
        content: (response.finalOutput as unknown as string) || "",
        metadata: {
          chatId: context.chatId,
          senderId: context.senderId,
          senderName,
        },
      };
    } catch (error) {
      console.log(error);
      console.error("Error in AI handler:", error);
      return null;
    }
  }
}
