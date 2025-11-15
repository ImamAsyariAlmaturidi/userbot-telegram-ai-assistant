import Conversation, {
  IConversation,
  IConversationMessage,
} from "../models/Conversation";
import { connectMongoDB, isMongoDBConnected } from "../connection";

/**
 * Robust conversation service with error handling and retry logic
 */
export class ConversationService {
  /**
   * Ensure MongoDB connection before operations
   */
  private async ensureConnection(): Promise<void> {
    if (!isMongoDBConnected()) {
      try {
        await connectMongoDB();
      } catch (error) {
        console.error(
          "[ConversationService] Failed to connect to MongoDB:",
          error
        );
        throw new Error("MongoDB connection failed");
      }
    }
  }

  /**
   * Get or create conversation session
   * Session ID format: ownerUserId_senderId
   */
  async getOrCreateConversation(
    ownerUserId: string,
    senderId: string
  ): Promise<IConversation> {
    await this.ensureConnection();

    try {
      const sessionId = `${ownerUserId}_${senderId}`;
      let conversation = await Conversation.findOne({ sessionId });

      if (!conversation) {
        conversation = await Conversation.create({
          sessionId,
          ownerUserId,
          senderId,
          messages: [],
        });
        console.log(
          `[ConversationService] Created new conversation: ${sessionId}`
        );
      }

      return conversation;
    } catch (error: any) {
      console.error(
        "[ConversationService] Error getting/creating conversation:",
        error
      );
      throw error;
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    ownerUserId: string,
    senderId: string,
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: any
  ): Promise<IConversation> {
    await this.ensureConnection();

    try {
      const conversation = await this.getOrCreateConversation(
        ownerUserId,
        senderId
      );

      const MAX_MESSAGES = 30;

      // Add new message
      conversation.messages.push({
        role,
        content,
        timestamp: new Date(),
        metadata: metadata || {},
      });

      // Keep only last 30 messages (remove oldest if exceeds)
      if (conversation.messages.length > MAX_MESSAGES) {
        const messagesToKeep = conversation.messages.slice(-MAX_MESSAGES);
        const removedCount = conversation.messages.length - MAX_MESSAGES;
        conversation.messages = messagesToKeep;
        console.log(
          `[ConversationService] Trimmed conversation to ${MAX_MESSAGES} messages (removed ${removedCount} oldest messages)`
        );
      }

      conversation.lastActivityAt = new Date();
      await (conversation as any).save();

      return conversation;
    } catch (error: any) {
      console.error("[ConversationService] Error adding message:", error);
      throw error;
    }
  }

  /**
   * Get conversation history (last N messages, max 30)
   */
  async getConversationHistory(
    ownerUserId: string,
    senderId: string,
    limit: number = 30
  ): Promise<IConversationMessage[]> {
    await this.ensureConnection();

    try {
      const sessionId = `${ownerUserId}_${senderId}`;
      const conversation = await Conversation.findOne({ sessionId });

      if (!conversation || conversation.messages.length === 0) {
        return [];
      }

      // Return last N messages (max 30)
      const maxLimit = Math.min(limit, 30);
      return conversation.messages.slice(-maxLimit);
    } catch (error: any) {
      console.error(
        "[ConversationService] Error getting conversation history:",
        error
      );
      // Return empty array on error to prevent breaking the flow
      return [];
    }
  }

  /**
   * Get full conversation
   */
  async getConversation(
    ownerUserId: string,
    senderId: string
  ): Promise<IConversation | null> {
    await this.ensureConnection();

    try {
      const sessionId = `${ownerUserId}_${senderId}`;
      return await Conversation.findOne({ sessionId });
    } catch (error: any) {
      console.error("[ConversationService] Error getting conversation:", error);
      return null;
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversation(
    ownerUserId: string,
    senderId: string
  ): Promise<boolean> {
    await this.ensureConnection();

    try {
      const sessionId = `${ownerUserId}_${senderId}`;
      const result = await Conversation.updateOne(
        { sessionId },
        { $set: { messages: [], lastActivityAt: new Date() } }
      );

      return result.modifiedCount > 0;
    } catch (error: any) {
      console.error(
        "[ConversationService] Error clearing conversation:",
        error
      );
      return false;
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(
    ownerUserId: string,
    senderId: string
  ): Promise<boolean> {
    await this.ensureConnection();

    try {
      const sessionId = `${ownerUserId}_${senderId}`;
      const result = await Conversation.deleteOne({ sessionId });
      return result.deletedCount > 0;
    } catch (error: any) {
      console.error(
        "[ConversationService] Error deleting conversation:",
        error
      );
      return false;
    }
  }

  /**
   * Get all conversations for an owner
   */
  async getOwnerConversations(ownerUserId: string): Promise<IConversation[]> {
    await this.ensureConnection();

    try {
      return await Conversation.find({ ownerUserId })
        .sort({ lastActivityAt: -1 })
        .limit(100);
    } catch (error: any) {
      console.error(
        "[ConversationService] Error getting owner conversations:",
        error
      );
      return [];
    }
  }

  /**
   * Format conversation history for AI context
   */
  formatHistoryForAI(messages: IConversationMessage[]): string {
    if (messages.length === 0) {
      return "";
    }

    let history = "\n\n📜 RIWAYAT PERCAKAPAN SEBELUMNYA:\n";
    history += "---\n";

    messages.forEach((msg, index) => {
      const roleLabel =
        msg.role === "user"
          ? "👤 User"
          : msg.role === "assistant"
          ? "🤖 AI"
          : "⚙️ System";
      history += `${roleLabel}: ${msg.content}\n`;
      if (index < messages.length - 1) {
        history += "---\n";
      }
    });

    history +=
      "\n💡 INSTRUKSI: Gunakan riwayat percakapan di atas untuk memahami konteks. Lanjutkan percakapan dengan natural dan relevan dengan riwayat sebelumnya.\n";

    return history;
  }

  /**
   * Get conversation history formatted for AI (with limit, max 30)
   */
  async getFormattedHistory(
    ownerUserId: string,
    senderId: string,
    limit: number = 30
  ): Promise<string> {
    // Ensure limit doesn't exceed 30
    const maxLimit = Math.min(limit, 30);
    const messages = await this.getConversationHistory(
      ownerUserId,
      senderId,
      maxLimit
    );
    return this.formatHistoryForAI(messages);
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
