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

      if (customPrompt) {
        console.log(
          `[AIMessageHandler] ✅ Using custom prompt (length: ${customPrompt.length})`
        );
        console.log(
          `[AIMessageHandler] Custom prompt preview: ${customPrompt.substring(
            0,
            100
          )}...`
        );
      } else {
        console.log(
          `[AIMessageHandler] ℹ️ Using default prompt (no custom prompt found)`
        );
      }

      // Build context message with ALL user info
      let userInfo = "User yang chat:\n";
      if (context.senderFirstName)
        userInfo += `- Nama Depan: ${context.senderFirstName}\n`;
      if (context.senderLastName)
        userInfo += `- Nama Belakang: ${context.senderLastName}\n`;
      if (context.senderUsername)
        userInfo += `- Username: @${context.senderUsername}\n`;
      userInfo += `- Telegram ID: ${context.senderId}\n`;

      const contextMessage = `${userInfo}\nPesan: ${context.message}`;

      const senderName =
        context.senderFirstName || context.senderUsername || "User";
      console.log(
        `[AIMessageHandler] Context: ${context.senderFirstName || "?"} ${
          context.senderLastName || ""
        } (@${context.senderUsername || "?"})`
      );

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
