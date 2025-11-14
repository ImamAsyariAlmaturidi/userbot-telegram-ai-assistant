import type { tool } from "langchain";

/**
 * Type for AI agent tools
 * Using ReturnType to get the correct type from langchain's tool function
 */
export type AgentTool = ReturnType<typeof tool>;

/**
 * Configuration for AI agent
 */
export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
