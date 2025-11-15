/**
 * Generate embeddings using OpenAI API
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"; // or "text-embedding-ada-002"

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
}

/**
 * Generate embeddings for text content using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }

  if (!text || !text.trim()) {
    throw new Error("Text content is required for embedding generation");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const embedding = data.data[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding response from OpenAI");
    }

    console.log(
      `[generateEmbedding] Generated embedding with ${embedding.length} dimensions`
    );

    return embedding;
  } catch (error: any) {
    console.error("[generateEmbedding] Error generating embedding:", error);
    throw error;
  }
}

/**
 * Convert embedding array to PostgreSQL vector format
 * Format: '[0.1,0.2,0.3,...]' as string for pgvector
 * PostgreSQL pgvector accepts this format directly
 */
export function embeddingToVectorString(embedding: number[]): string {
  // Format: [0.1,0.2,0.3] - no spaces, comma-separated
  return `[${embedding.join(",")}]`;
}

/**
 * Convert PostgreSQL vector string to array
 */
export function vectorStringToEmbedding(vectorString: string): number[] {
  // Remove brackets and split by comma
  const cleaned = vectorString.replace(/[\[\]]/g, "");
  return cleaned.split(",").map((val) => parseFloat(val.trim()));
}
