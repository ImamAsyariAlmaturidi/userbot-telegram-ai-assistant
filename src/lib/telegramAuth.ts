/**
 * @deprecated This file is kept for backward compatibility
 * Please use lib/telegram/auth.ts instead
 */

// Re-export from new modular structure
export {
  sendCode,
  startClient,
  checkAuthStatus,
  logoutClient,
} from "./telegram/auth";
