import { TelegramClient } from "telegram";

/**
 * Global store untuk menyimpan userbot client yang sedang running
 */
class UserbotStore {
  private clients: Map<string, TelegramClient> = new Map();
  private userIds: Map<string, string> = new Map(); // sessionString -> userId

  /**
   * Set client untuk session tertentu
   */
  set(sessionString: string, client: TelegramClient, userId?: string): void {
    this.clients.set(sessionString, client);
    if (userId) {
      this.userIds.set(sessionString, userId);
    }
  }

  /**
   * Check apakah user ID ini punya userbot yang running
   */
  hasUserbotRunning(userId: string): boolean {
    return Array.from(this.userIds.values()).includes(userId);
  }

  /**
   * Get user ID untuk session tertentu
   */
  getUserId(sessionString: string): string | undefined {
    return this.userIds.get(sessionString);
  }

  /**
   * Get client untuk session tertentu
   */
  get(sessionString: string): TelegramClient | undefined {
    return this.clients.get(sessionString);
  }

  /**
   * Check apakah client sudah running untuk session tertentu
   */
  has(sessionString: string): boolean {
    return this.clients.has(sessionString);
  }

  /**
   * Check apakah client masih connected
   */
  isConnected(sessionString: string): boolean {
    const client = this.clients.get(sessionString);
    return client ? client.connected ?? false : false;
  }

  /**
   * Remove dan disconnect client
   */
  async remove(sessionString: string): Promise<void> {
    const client = this.clients.get(sessionString);
    if (client) {
      try {
        if (client.connected) {
          await client.disconnect();
        }
      } catch (err) {
        console.error("Error disconnecting client:", err);
      }
      this.clients.delete(sessionString);
      this.userIds.delete(sessionString);
    }
  }

  /**
   * Remove semua clients
   */
  async clear(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map((key) =>
      this.remove(key)
    );
    await Promise.all(promises);
  }
}

export const userbotStore = new UserbotStore();
