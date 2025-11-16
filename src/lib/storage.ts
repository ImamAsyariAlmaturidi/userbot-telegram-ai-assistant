/**
 * Helper untuk localStorage session management
 */

const SESSION_KEY = "tg_session";
const PHONE_HASH_KEY = "tg_phone_hash";

export const storage = {
  /**
   * Get session dari localStorage
   */
  getSession(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch (error) {
      console.error("[storage] Error getting session:", error);
      return null;
    }
  },

  /**
   * Set session ke localStorage
   */
  setSession(session: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SESSION_KEY, session);
    } catch (error) {
      console.error("[storage] Error setting session:", error);
    }
  },

  /**
   * Remove session dari localStorage
   */
  removeSession(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PHONE_HASH_KEY);
    } catch (error) {
      console.error("[storage] Error removing session:", error);
    }
  },

  /**
   * Get phone hash dari localStorage (untuk verify code)
   */
  getPhoneHash(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(PHONE_HASH_KEY);
    } catch (error) {
      console.error("[storage] Error getting phone hash:", error);
      return null;
    }
  },

  /**
   * Set phone hash ke localStorage
   */
  setPhoneHash(hash: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PHONE_HASH_KEY, hash);
    } catch (error) {
      console.error("[storage] Error setting phone hash:", error);
    }
  },

  /**
   * Remove phone hash dari localStorage
   */
  removePhoneHash(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(PHONE_HASH_KEY);
    } catch (error) {
      console.error("[storage] Error removing phone hash:", error);
    }
  },
};
