import { prisma } from "@/lib/prisma";
import { generateEmbedding, embeddingToVectorString } from "../embeddings";

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchOptions {
  limit?: number; // Berapa banyak hasil yang dikembalikan (default: 5)
  threshold?: number; // Minimum similarity score (0-1, default: 0.7)
}

/**
 * Mencari konten di knowledge source menggunakan vector similarity search
 * @param query - Teks query untuk dicari
 * @param options - Opsi pencarian (limit, threshold)
 * @returns Array hasil pencarian dengan similarity score
 */
export async function searchKnowledge(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 5, threshold = 0.7 } = options;

  if (!query || !query.trim()) {
    throw new Error("Query tidak boleh kosong");
  }

  try {
    // 1. Generate embedding untuk query
    console.log(
      `[searchKnowledge] Generating embedding untuk query: "${query}"`
    );
    const queryEmbedding = await generateEmbedding(query.trim());
    const queryVector = embeddingToVectorString(queryEmbedding);

    // 2. Lakukan vector similarity search menggunakan cosine similarity
    // Menggunakan operator <=> untuk cosine distance (1 - cosine similarity)
    // Semakin kecil distance, semakin mirip (similarity tinggi)
    const results = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        id,
        content,
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt",
        1 - (embeddings <=> $1::vector) as similarity
      FROM knowledge_source
      WHERE embeddings IS NOT NULL
        AND 1 - (embeddings <=> $1::vector) >= $2
      ORDER BY embeddings <=> $1::vector
      LIMIT $3
      `,
      queryVector,
      threshold,
      limit
    );

    console.log(
      `[searchKnowledge] Ditemukan ${results.length} hasil yang relevan`
    );

    // 3. Format hasil
    const formattedResults: SearchResult[] = results.map((row) => ({
      id: row.id,
      content: row.content,
      similarity: parseFloat(row.similarity.toFixed(4)),
      metadata: row.metadata,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));

    return formattedResults;
  } catch (error: any) {
    console.error("[searchKnowledge] Error:", error);
    throw new Error(`Gagal mencari di knowledge source: ${error.message}`);
  }
}

/**
 * Mencari konten terbaik (paling relevan) di knowledge source
 * @param query - Teks query untuk dicari
 * @param minSimilarity - Minimum similarity score (default: 0.7)
 * @returns Hasil terbaik atau null jika tidak ada yang cukup relevan
 */
export async function searchBestMatch(
  query: string,
  minSimilarity: number = 0.7
): Promise<SearchResult | null> {
  const results = await searchKnowledge(query, {
    limit: 1,
    threshold: minSimilarity,
  });

  return results.length > 0 ? results[0] : null;
}

/**
 * Mencari konten di knowledge source menggunakan PostgreSQL function
 * Alternative method menggunakan stored procedure match_knowledge_source
 * @param query - Teks query untuk dicari
 * @param options - Opsi pencarian (limit, threshold)
 * @returns Array hasil pencarian dengan similarity score
 */
export async function searchKnowledgeWithFunction(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 5, threshold = 0.7 } = options;

  if (!query || !query.trim()) {
    throw new Error("Query tidak boleh kosong");
  }

  try {
    // 1. Generate embedding untuk query
    console.log(
      `[searchKnowledgeWithFunction] Generating embedding untuk query: "${query}"`
    );
    const queryEmbedding = await generateEmbedding(query.trim());
    const queryVector = embeddingToVectorString(queryEmbedding);

    // 2. Gunakan PostgreSQL function match_knowledge_source
    const results = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM match_knowledge_source($1::vector, $2::float, $3::int)`,
      queryVector,
      threshold,
      limit
    );

    console.log(
      `[searchKnowledgeWithFunction] Ditemukan ${results.length} hasil yang relevan`
    );

    // 3. Format hasil
    const formattedResults: SearchResult[] = results.map((row) => ({
      id: row.id,
      content: row.content,
      similarity: parseFloat(row.similarity.toFixed(4)),
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    return formattedResults;
  } catch (error: any) {
    console.error("[searchKnowledgeWithFunction] Error:", error);
    throw new Error(`Gagal mencari di knowledge source: ${error.message}`);
  }
}

/**
 * Mencari dan menggabungkan beberapa hasil terbaik menjadi context
 * Berguna untuk memberikan context ke AI agent
 * @param query - Teks query untuk dicari
 * @param options - Opsi pencarian
 * @returns String context yang menggabungkan semua hasil relevan
 */
export async function searchAndBuildContext(
  query: string,
  options: SearchOptions = {}
): Promise<string> {
  const results = await searchKnowledge(query, options);

  if (results.length === 0) {
    return "Tidak ditemukan informasi yang relevan di knowledge base.";
  }

  // Build context dari hasil pencarian
  let context = "📚 Informasi dari Knowledge Base:\n\n";

  results.forEach((result, index) => {
    context += `${index + 1}. (Relevansi: ${(result.similarity * 100).toFixed(
      1
    )}%)\n`;
    context += `${result.content}\n\n`;
  });

  return context.trim();
}
