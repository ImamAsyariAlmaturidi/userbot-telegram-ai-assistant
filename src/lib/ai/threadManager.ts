import { OpenAIConversationsSession } from "@openai/agents";
import type { AgentInputItem } from "@openai/agents-core";
import { createHash } from "crypto";

/**
 * Thread Manager untuk conversation history menggunakan OpenAIConversationsSession
 * Session ID format: ownerUserId_senderId
 * Conversation ID format: conv_<hash> (OpenAI requires conversation_id to start with 'conv_')
 * Auto-limit 30 messages (removes oldest when exceeds)
 */
class ThreadManager {
  private sessionStore: Map<string, OpenAIConversationsSession> = new Map();
  private conversationIdMap: Map<string, string> = new Map(); // sessionKey -> conversationId
  private readonly MAX_MESSAGES = 30;

  /**
   * Get session key untuk conversation
   */
  private getSessionKey(ownerUserId: string, senderId: string): string {
    return `${ownerUserId}_${senderId}`;
  }

  /**
   * Generate valid conversation ID from session key
   * OpenAI requires conversation_id to start with 'conv_'
   */
  private getConversationId(sessionKey: string): string {
    // Check if we already have a conversation ID for this session
    if (this.conversationIdMap.has(sessionKey)) {
      return this.conversationIdMap.get(sessionKey)!;
    }

    // Generate conversation ID: conv_<hash>
    // Use first 24 chars of hash to keep it reasonable length
    const hash = createHash("sha256")
      .update(sessionKey)
      .digest("hex")
      .substring(0, 24);
    const conversationId = `conv_${hash}`;

    // Store mapping
    this.conversationIdMap.set(sessionKey, conversationId);
    return conversationId;
  }

  /**
   * Get or create session untuk conversation
   */
  async getOrCreateSession(
    ownerUserId: string,
    senderId: string
  ): Promise<OpenAIConversationsSession> {
    const sessionKey = this.getSessionKey(ownerUserId, senderId);

    // Check if session exists in memory
    if (this.sessionStore.has(sessionKey)) {
      return this.sessionStore.get(sessionKey)!;
    }

    // Create new session without conversationId
    // OpenAI will auto-generate conversationId on first message
    // We don't provide conversationId initially to avoid 404 errors
    try {
      const session = new OpenAIConversationsSession({
        // Don't provide conversationId - let OpenAI create it automatically
        // conversationId will be created when first message is sent
      });

      this.sessionStore.set(sessionKey, session);
      console.log(`[ThreadManager] Created new session: ${sessionKey}`);
      return session;
    } catch (error) {
      console.error("[ThreadManager] Error creating session:", error);
      throw error;
    }
  }

  /**
   * Get existing session (returns null if not found)
   */
  getSession(
    ownerUserId: string,
    senderId: string
  ): OpenAIConversationsSession | null {
    const sessionKey = this.getSessionKey(ownerUserId, senderId);
    return this.sessionStore.get(sessionKey) || null;
  }

  /**
   * Get conversation history (last N messages, max 30)
   */
  async getHistory(
    ownerUserId: string,
    senderId: string,
    limit: number = 30
  ): Promise<AgentInputItem[]> {
    try {
      const session = await this.getOrCreateSession(ownerUserId, senderId);
      const allItems = await session.getItems();

      // Return last N items (max 30)
      const maxLimit = Math.min(limit, this.MAX_MESSAGES);
      return allItems.slice(-maxLimit);
    } catch (error) {
      console.error("[ThreadManager] Error getting history:", error);
      return [];
    }
  }

  /**
   * Trim conversation to MAX_MESSAGES (removes oldest messages)
   * Call this after run() to ensure conversation stays within limit
   */
  async trimConversation(ownerUserId: string, senderId: string): Promise<void> {
    try {
      const session = await this.getOrCreateSession(ownerUserId, senderId);
      const items = await session.getItems();

      if (items.length > this.MAX_MESSAGES) {
        const itemsToRemove = items.length - this.MAX_MESSAGES;

        // Remove oldest items (pop from front)
        for (let i = 0; i < itemsToRemove; i++) {
          await session.popItem();
        }

        console.log(
          `[ThreadManager] Trimmed conversation to ${this.MAX_MESSAGES} messages (removed ${itemsToRemove} oldest messages)`
        );
      }
    } catch (error) {
      console.error("[ThreadManager] Error trimming conversation:", error);
      // Don't throw, just log error
    }
  }

  /**
   * Clear conversation history
   */
  async clearSession(ownerUserId: string, senderId: string): Promise<boolean> {
    try {
      const sessionKey = this.getSessionKey(ownerUserId, senderId);
      const session = this.sessionStore.get(sessionKey);

      if (session) {
        await session.clearSession();
        this.sessionStore.delete(sessionKey);
        this.conversationIdMap.delete(sessionKey); // Also remove from mapping
        console.log(`[ThreadManager] Cleared session: ${sessionKey}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("[ThreadManager] Error clearing session:", error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(ownerUserId: string, senderId: string): Promise<boolean> {
    return this.clearSession(ownerUserId, senderId);
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessionStore.size;
  }
}

// Export singleton instance
export const threadManager = new ThreadManager();
