-- Setup Knowledge Source Table dengan Vector Embeddings
-- Jalankan script ini di Supabase SQL Editor

-- 1. Enable vector extension (jika belum ada)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create knowledge_source table dengan vector embeddings
CREATE TABLE IF NOT EXISTS "knowledge_source" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embeddings" vector,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_source_pkey" PRIMARY KEY ("id")
);

-- 3. Add knowledge_source_id column ke ai_configure table (jika belum ada)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_configure' 
        AND column_name = 'knowledge_source_id'
    ) THEN
        ALTER TABLE "ai_configure" ADD COLUMN "knowledge_source_id" TEXT;
    END IF;
END $$;

-- 4. Create index untuk knowledge_source_id di ai_configure
CREATE INDEX IF NOT EXISTS "ai_configure_knowledge_source_id_idx" ON "ai_configure"("knowledge_source_id");

-- 5. Add foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_configure_knowledge_source_id_fkey'
    ) THEN
        ALTER TABLE "ai_configure" 
        ADD CONSTRAINT "ai_configure_knowledge_source_id_fkey" 
        FOREIGN KEY ("knowledge_source_id") 
        REFERENCES "knowledge_source"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Create function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_knowledge_source_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS update_knowledge_source_updated_at ON "knowledge_source";
CREATE TRIGGER update_knowledge_source_updated_at
    BEFORE UPDATE ON "knowledge_source"
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_source_updated_at();

-- 8. Optional: Create index untuk vector similarity search (jika diperlukan)
-- Uncomment jika ingin menggunakan vector similarity search
-- CREATE INDEX IF NOT EXISTS "knowledge_source_embeddings_idx" 
-- ON "knowledge_source" USING ivfflat (embeddings vector_cosine_ops)
-- WITH (lists = 100);

-- 9. Create function untuk vector similarity search
-- Function ini digunakan untuk mencari knowledge source berdasarkan similarity
CREATE OR REPLACE FUNCTION match_knowledge_source (
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT
) RETURNS TABLE (
    id TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP(3),
    updated_at TIMESTAMP(3),
    similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ks.id,
        ks.content,
        ks.metadata,
        ks.created_at,
        ks.updated_at,
        (1 - (ks.embeddings <=> query_embedding))::FLOAT AS similarity
    FROM
        knowledge_source ks
    WHERE
        ks.embeddings IS NOT NULL
        AND (1 - (ks.embeddings <=> query_embedding)) > match_threshold
    ORDER BY
        ks.embeddings <=> query_embedding ASC
    LIMIT
        match_count;
END;
$$;

