import { tools } from "./tools";
import type { AgentConfig } from "./types";
import { run, Agent, Tool } from "@openai/agents";
import { webSearchTool } from "@openai/agents";

// Hardcode prompt statis (base prompt)
const HARDCODE_PROMPT = `
 kamu membantu kebutuhan seseorang yang chat kamu melalui platform telegram, jika pertanyaan general gunakan web search tool.

PENTING - Format Jawaban untuk Telegram:
1. Format Text yang Didukung Telegram:
   - **Bold text** menggunakan **text** atau __text__
   - *Italic text* menggunakan *text* atau _text_
   - Code menggunakan backtick text backtick (untuk inline code)
   - Code block menggunakan triple backtick (untuk code block)
   - [Link text](url) untuk hyperlink
   - JANGAN gunakan markdown headers seperti #, ##, ###, #### (tidak didukung Telegram)
   - Untuk judul/heading, gunakan **Bold** atau __Bold__ sebagai gantinya
   - Contoh yang BENAR: **1. Geografi** atau __2. Sejarah__
   - Contoh yang SALAH: ### 1. Geografi atau ## 2. Sejarah
`;

/**
 * Creates an AI agent with configured tools and custom instructions
 * Combines hardcode prompt + custom prompt from database
 * Includes user context for personalized responses
 */
export function createUserbotAgent(
  customInstructions?: string,
  userContext?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    userId?: string;
  }
) {
  // Build base instructions with user context
  let finalInstructions = HARDCODE_PROMPT;

  console.log("userContext", userContext);
  // Add user context instruction if provided
  if (userContext) {
    const { firstName, lastName, username, userId } = userContext;
    let userInfoInstruction = "\n\n📌 PENTING - Informasi User yang Chat:\n";

    if (firstName) userInfoInstruction += `- Nama Depan: ${firstName}\n`;
    if (lastName) userInfoInstruction += `- Nama Belakang: ${lastName}\n`;
    if (username) userInfoInstruction += `- Username: @${username}\n`;
    if (userId) userInfoInstruction += `- Telegram ID: ${userId}\n`;

    // Add greeting instruction
    const displayName = firstName || username || "User";
    if (displayName !== "User") {
      userInfoInstruction += `\n✅ Sapa user dengan nama mereka (${displayName}) di awal percakapan atau saat merespons.`;
    }

    finalInstructions += userInfoInstruction;
  }

  if (customInstructions && customInstructions.trim()) {
    // Tambahkan custom prompt setelah hardcode prompt
    finalInstructions = `${finalInstructions}\n\n--- Custom Instructions ---\n${customInstructions.trim()}`;
  }

  return new Agent({
    name: "userbot-agent",
    model: "gpt-4o-mini",
    instructions: finalInstructions,
    tools: [webSearchTool()],
  });
}

/**
 * Default userbot agent instance with default instructions
 */
export const userbotAgent = createUserbotAgent();
