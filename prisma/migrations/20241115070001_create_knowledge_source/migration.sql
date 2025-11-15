-- Enable vector extension (required for embeddings)
-- Note: This must be run before creating the knowledge_source table
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE IF NOT EXISTS "knowledge_source" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embeddings" vector,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if needed for vector similarity search)
-- Uncomment if you want to use vector similarity search
-- CREATE INDEX IF NOT EXISTS "knowledge_source_embeddings_idx" 
-- ON "knowledge_source" USING ivfflat (embeddings vector_cosine_ops)
-- WITH (lists = 100);

-- Add knowledge_source_id column to ai_configure table if it doesn't exist
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_configure_knowledge_source_id_idx" ON "ai_configure"("knowledge_source_id");

-- AddForeignKey
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

-- Create function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_knowledge_source_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS update_knowledge_source_updated_at ON "knowledge_source";
CREATE TRIGGER update_knowledge_source_updated_at
    BEFORE UPDATE ON "knowledge_source"
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_source_updated_at();

