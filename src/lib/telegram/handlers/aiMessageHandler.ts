import type { MessageHandler } from "./messageHandler";
import type { MessageContext, AgentResponse } from "../../../../types";
import { createUserbotAgent } from "../../../lib/ai/agent";
import { getCustomPrompt } from "../../../lib/ai/getCustomPrompt";
import { run } from "@openai/agents";
import { threadManager } from "../../../lib/ai/threadManager";
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

      // Get or create session for conversation history
      let session = null;
      if (this.ownerUserId) {
        try {
          session = await threadManager.getOrCreateSession(
            this.ownerUserId,
            String(context.senderId)
          );
        } catch (error) {
          console.error(
            "[AIMessageHandler] Error getting/creating session:",
            error
          );
          // Continue without session if error
        }
      }

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

      // When using session, we can add sender context as system message or include in user message
      // For now, we'll include it in the message when using session
      const userMessage = session
        ? `${senderContext}\n\nPesan: ${context.message}`
        : `${senderContext}\n---\n\nPESAN DARI USER:\n${context.message}`;

      const contextMessage = userMessage; // For fallback when no session

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

      // Run agent with session for conversation history
      // When using session, include sender context in the message
      // Session automatically handles conversation history
      let response;
      try {
        response = await Promise.race([
          session
            ? run(agent, userMessage, { session })
            : run(agent, contextMessage),
          timeoutPromise,
        ]);
      } catch (error: any) {
        // Handle 404 error (conversation not found) - retry without session
        if (error?.status === 404 && session) {
          console.warn(
            "[AIMessageHandler] Conversation not found, retrying without session"
          );
          // Clear session and retry without it
          if (this.ownerUserId) {
            try {
              await threadManager.clearSession(
                this.ownerUserId,
                String(context.senderId)
              );
            } catch (clearError) {
              console.error(
                "[AIMessageHandler] Error clearing session:",
                clearError
              );
            }
          }
          // Retry without session
          response = await Promise.race([
            run(agent, contextMessage),
            timeoutPromise,
          ]);
        } else {
          throw error;
        }
      }

      const aiResponse = (response.finalOutput as unknown as string) || "";

      // Trim conversation to 30 messages if using session
      // run() automatically saves messages to session, so we trim after
      if (session && this.ownerUserId) {
        try {
          await threadManager.trimConversation(
            this.ownerUserId,
            String(context.senderId)
          );
        } catch (error) {
          console.error(
            "[AIMessageHandler] Error trimming conversation:",
            error
          );
          // Continue even if trimming fails
        }
      }

      return {
        content: aiResponse,
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
