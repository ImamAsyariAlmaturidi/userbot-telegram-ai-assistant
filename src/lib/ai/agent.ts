import { tools } from "./tools";
import type { AgentConfig } from "./types";
import { run, Agent, Tool } from "@openai/agents";
import { webSearchTool } from "@openai/agents";
import agentRag from "./tools/rag";

// Hardcode prompt statis (base prompt)
const HARDCODE_PROMPT = `
Kamu adalah asisten AI yang membantu seseorang melalui platform Telegram.

🔴 ATURAN WAJIB - Urutan Penggunaan Tools:

1. SELALU gunakan tool "knowledge_search" TERLEBIH DAHULU untuk SETIAP pertanyaan
   - Tool ini mencari di knowledge base internal
   - Gunakan untuk: produk, layanan, FAQ, dokumentasi, informasi spesifik
   - JANGAN SKIP langkah ini!

2. Jika knowledge_search tidak menemukan informasi (atau relevansi < 70%):
   - Baru gunakan web_search untuk mencari di internet
   
3. Untuk pertanyaan cuaca:
   - Gunakan weather tool

⚠️ PENTING: Jika user bertanya tentang APAPUN, WAJIB cek knowledge_search dulu!

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

2. Jawab dengan bahasa yang natural, ramah, dan membantu
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
    modelSettings: {
      reasoning: { effort: "low" },
    },
    model: "gpt-5",
    instructions: finalInstructions,
    tools: [
      webSearchTool(),
      agentRag.asTool({
        toolName: "knowledge_search",
        toolDescription: "Get the knowledge base",
      }),
    ],
  });
}

/**
 * Default userbot agent instance with default instructions
 */
export const userbotAgent = createUserbotAgent();
