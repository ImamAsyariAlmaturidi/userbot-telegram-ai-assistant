-- Schema untuk menyimpan data user dan custom prompt
-- Jalankan script ini di Supabase SQL Editor

-- Table untuk menyimpan data user yang berhasil login
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id BIGINT UNIQUE NOT NULL,
  phone_number TEXT,
  init_data_raw TEXT,
  init_data_user JSONB,
  init_data_chat JSONB,
  custom_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk mempercepat query berdasarkan telegram_user_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users(telegram_user_id);

-- Function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - optional, sesuaikan dengan kebutuhan
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy untuk allow all operations (sesuaikan dengan kebutuhan security Anda)
-- Untuk development, bisa menggunakan policy ini:
CREATE POLICY "Allow all operations for authenticated users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Atau untuk production, gunakan policy yang lebih ketat:
-- CREATE POLICY "Users can only access their own data" ON users
--   FOR ALL
--   USING (auth.uid()::text = telegram_user_id::text)
--   WITH CHECK (auth.uid()::text = telegram_user_id::text);

