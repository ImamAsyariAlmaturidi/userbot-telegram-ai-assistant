# Deploy Bot Worker ke Render

## 📋 Prerequisites

1. Akun Render (gratis): https://render.com
2. Repository GitHub sudah push (untuk auto-deploy)
3. Environment variables siap

## 🚀 Step-by-Step Deployment

### 1. Login ke Render

1. Buka https://render.com
2. Sign up / Login dengan GitHub
3. Connect GitHub account jika belum

### 2. Create New Web Service

1. Klik **"New +"** → **"Web Service"**
2. Connect repository GitHub kamu
3. Pilih repository `ai-agent-userbot-mini-app`

### 3. Configure Service

**Basic Settings:**

- **Name:** `userbot-worker` (atau nama lain)
- **Region:** Pilih yang terdekat (Singapore recommended untuk Indonesia)
- **Branch:** `main` (atau branch yang kamu pakai)
- **Root Directory:** (kosongkan, atau `bot` jika mau)

**Build & Start:**

**Option 1: Menggunakan Node.js + tsx (Recommended untuk Render)**

⚠️ **Bun tidak reliable di Render**, gunakan Node.js + tsx:

- **Runtime:** `Node`
- **Build Command:**
  ```bash
  npm install && npx prisma generate
  ```
  (PENTING: `prisma generate` harus dijalankan untuk generate Prisma Client untuk Linux)
- **Start Command:**
  ```bash
  npm run bot:node
  ```
  (Script `bot:node` sudah ditambahkan di package.json, `tsx` sudah di dependencies)

**Option 2: Menggunakan Bun (Jika mau coba)**

- **Runtime:** `Node`
- **Build Command:**
  ```bash
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  $HOME/.bun/bin/bun install
  ```
- **Start Command:**
  ```bash
  /opt/render/.bun/bin/bun run bot/run.ts
  ```
  (Gunakan absolute path `/opt/render/.bun/bin/bun` bukan `$HOME/.bun/bin/bun`)

### 4. Setup Environment Variables

Klik **"Environment"** tab, tambahkan:

```
DATABASE_URL=postgresql://user:password@host:port/database
TG_API_ID=your_telegram_api_id
TG_API_HASH=your_telegram_api_hash
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
```

**Cara dapat DATABASE_URL:**

- Jika pakai Supabase: Settings → Database → Connection string
- Jika pakai PostgreSQL lain: Format: `postgresql://user:password@host:port/dbname`

### 5. Advanced Settings (Optional)

**Auto-Deploy:**

- ✅ Enable "Auto-Deploy" untuk auto-update saat push ke GitHub

**Health Check:**

- Bisa skip untuk bot worker (tidak perlu HTTP endpoint)

**Plan:**

- **Free:** Gratis (tapi sleep setelah 15 menit idle)
- **Starter ($7/bulan):** Tidak sleep, 24/7 running

### 6. Deploy

1. Klik **"Create Web Service"**
2. Render akan mulai build dan deploy
3. Tunggu sampai status jadi **"Live"** (hijau)

## ⚠️ Important Notes

### Free Tier Limitations

**Render Free Tier:**

- Service akan **sleep** setelah 15 menit tidak ada traffic
- Bot worker perlu **24/7 running**, jadi free tier mungkin tidak cocok
- **Solusi:** Upgrade ke Starter ($7/bulan) untuk 24/7

**Alternatif untuk Free Tier:**

- Bisa setup **Uptime Robot** (gratis) untuk ping service setiap 5 menit
- Atau upgrade ke Starter plan

### Bun Installation

Jika Render tidak support Bun secara native:

1. **Option 1:** Install Bun di build command (seperti di atas)
2. **Option 2:** Gunakan Node.js + tsx:

   ```bash
   # Build Command
   npm install

   # Start Command
   npx tsx bot/run.ts
   ```

   (Perlu install `tsx` di package.json)

### Monitoring

1. **Logs:** Klik service → "Logs" tab
2. **Metrics:** Klik service → "Metrics" tab
3. **Events:** Klik service → "Events" tab

## 🔧 Troubleshooting

### Bot tidak jalan

1. **Cek Logs:**

   - Klik service → "Logs"
   - Cari error messages

2. **Cek Environment Variables:**

   - Pastikan semua env vars sudah di-set
   - Format DATABASE_URL harus benar

3. **Cek Build:**
   - Pastikan build command berhasil
   - Cek apakah Bun terinstall

### Service sleep (Free Tier)

**Problem:** Service sleep setelah 15 menit idle

**Solusi:**

1. **Upgrade ke Starter** ($7/bulan) - Recommended
2. **Setup Uptime Robot:**
   - Buat account di https://uptimerobot.com
   - Add monitor → HTTP(s) → URL service kamu
   - Set interval 5 menit
   - Service akan auto-wake saat di-ping

### Connection Issues

1. **Database Connection:**

   - Pastikan DATABASE_URL benar
   - Cek apakah database allow connection dari Render IP

2. **Telegram Connection:**
   - Pastikan TG_API_ID dan TG_API_HASH benar
   - Cek logs untuk error connection

## 📊 After Deployment

### Verify Bot Running

1. Cek logs di Render dashboard
2. Harus ada log: `🤖 Userbot Worker is running!`
3. Harus ada log: `✅ Userbot started successfully for user: ...`

### Test Bot

1. Kirim pesan ke Telegram userbot
2. Bot harus merespons
3. Cek logs untuk melihat aktivitas

## 💰 Cost Estimate

- **Free Tier:** Gratis (tapi sleep setelah idle)
- **Starter:** $7/bulan (24/7, recommended untuk bot worker)
- **Professional:** $25/bulan (jika butuh lebih resources)

**Rekomendasi:** Starter ($7/bulan) untuk bot worker yang perlu 24/7.

## 🎯 Quick Checklist

- [ ] Akun Render dibuat
- [ ] Repository GitHub connected
- [ ] Web Service created
- [ ] Build command configured
- [ ] Start command configured
- [ ] Environment variables set
- [ ] Service deployed
- [ ] Logs checked (bot running)
- [ ] Bot tested (kirim pesan)

## 📝 Notes

- Render akan auto-redeploy saat push ke GitHub (jika auto-deploy enabled)
- Logs bisa diakses real-time di dashboard
- Service bisa di-restart manual dari dashboard
- Environment variables bisa di-update tanpa redeploy
