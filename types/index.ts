// Common types used across the application

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}

export interface ClientConfig {
  connectionRetries?: number;
  retryDelay?: number;
  requestRetries?: number;
  autoReconnect?: boolean;
  useWSS?: boolean;
  useIPV6?: boolean;
  testServers?: boolean;
}

export interface MessageContext {
  chatId: number | string;
  senderId: number | string;
  message: string;
  isOutgoing: boolean;
  senderUsername?: string;
  senderFirstName?: string;
  senderLastName?: string;
}

export interface AgentResponse {
  content: string;
  metadata?: Record<string, unknown>;
}
