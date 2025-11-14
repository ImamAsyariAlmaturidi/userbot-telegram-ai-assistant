# Setup Supabase untuk AI Agent Userbot Mini App

## Langkah-langkah Setup

### 1. Buat Project di Supabase

1. Buka [https://supabase.com](https://supabase.com)
2. Login atau daftar akun
3. Klik "New Project"
4. Isi nama project dan password database
5. Pilih region (pilih yang terdekat dengan server Anda)
6. Tunggu sampai project selesai dibuat

### 2. Dapatkan API Keys

1. Di dashboard Supabase, klik "Settings" (ikon gear) di sidebar kiri
2. Pilih "API" di menu Settings
3. Copy **Project URL** dan **anon/public key**
4. Masukkan ke file `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Buat Table di Database

1. Di dashboard Supabase, klik "SQL Editor" di sidebar kiri
2. Klik "New Query"
3. Copy semua isi dari file `supabase-schema.sql`
4. Paste ke SQL Editor
5. Klik "Run" atau tekan `Ctrl/Cmd + Enter`
6. Pastikan tidak ada error dan muncul pesan sukses

### 4. Verifikasi Table

1. Klik "Table Editor" di sidebar kiri
2. Pastikan ada table bernama `users`
3. Klik table `users` untuk melihat strukturnya
4. Table harus memiliki kolom:
   - `id` (UUID, primary key)
   - `telegram_user_id` (BIGINT, unique)
   - `phone_number` (TEXT, nullable)
   - `init_data_raw` (TEXT, nullable)
   - `init_data_user` (JSONB, nullable)
   - `init_data_chat` (JSONB, nullable)
   - `custom_prompt` (TEXT, nullable)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

### 5. Test Koneksi

Setelah semua setup selesai, coba akses halaman `/customize-prompt` di aplikasi. Jika berhasil, data user akan otomatis tersimpan ke database.

## Troubleshooting

### Error: "relation 'users' does not exist"

- Pastikan SQL script sudah dijalankan di SQL Editor
- Cek apakah ada error saat menjalankan script

### Error: "new row violates row-level security policy"

- Di Supabase dashboard, buka "Authentication" > "Policies"
- Atau nonaktifkan RLS sementara untuk testing:
  ```sql
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ```

### Error: "permission denied for table users"

- Pastikan menggunakan `anon` key yang benar
- Cek RLS policies di Supabase dashboard

## Catatan Keamanan

Untuk production, sebaiknya:

1. Buat policy RLS yang lebih ketat
2. Gunakan service role key untuk operasi server-side (jangan expose ke client)
3. Validasi input di API routes
4. Gunakan prepared statements (sudah dilakukan oleh Supabase client)
