import { Agent, tool } from "@openai/agents";
import { z } from "zod";
import { searchAndBuildContext } from "../action/querySearch";

const ragTool = tool({
  name: "get_knowledge_base",

  description:
    "Mencari informasi spesifik di knowledge base internal (produk, layanan, FAQ, dokumentasi). JANGAN gunakan untuk greeting/small talk seperti 'hi', 'halo', 'apa kabar'. Hanya gunakan untuk pertanyaan yang memerlukan informasi spesifik dari knowledge base. Gunakan HANYA SEKALI per pesan dengan query yang mencakup inti pertanyaan.",
  parameters: z.object({
    query: z.string().describe("Pertanyaan atau kata kunci untuk dicari"),
  }),
  async execute({ query }) {
    try {
      console.log(`[RAG Tool] Searching knowledge base for: "${query}"`);

      // Retry mechanism: coba sampai 3 kali dengan threshold yang makin rendah
      const maxRetries = 3;
      const thresholds = [0.7, 0.5, 0.3]; // Mulai strict, lalu lebih loose

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const threshold = thresholds[attempt];
        console.log(
          `[RAG Tool] Attempt ${
            attempt + 1
          }/${maxRetries} with threshold ${threshold}`
        );

        const context = await searchAndBuildContext(query, {
          limit: 3,
          threshold: threshold,
        });

        // Cek apakah menemukan hasil yang relevan
        if (!context.includes("Tidak ditemukan informasi yang relevan")) {
          console.log(
            `[RAG Tool] ✅ Found results on attempt ${attempt + 1} (length: ${
              context.length
            } chars)`
          );
          return context;
        }

        console.log(
          `[RAG Tool] ⚠️ No results found with threshold ${threshold}, retrying...`
        );
      }

      // Setelah 3 kali retry masih tidak ketemu
      console.log(
        `[RAG Tool] ❌ No results found after ${maxRetries} attempts`
      );
      return "Tidak ditemukan informasi yang relevan di knowledge base setelah beberapa kali pencarian.";
    } catch (error: any) {
      console.error("[RAG Tool] Error:", error);
      return `Error mencari di knowledge base: ${error.message}`;
    }
  },
});

const agentRag = new Agent({
  name: "rag",
  model: "gpt-4o-mini",
  instructions:
    "Kamu adalah asisten yang membantu mencari dan memberikan informasi dari knowledge base. Berikan informasi yang relevan dan akurat berdasarkan hasil pencarian.",
  tools: [ragTool],
});

export default agentRag;
