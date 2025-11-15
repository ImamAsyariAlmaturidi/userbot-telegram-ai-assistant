-- Add userbot_enabled column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "userbot_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "users_userbot_enabled_idx" ON "users"("userbot_enabled");

