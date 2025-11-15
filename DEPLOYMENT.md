# Deployment Guide

## ⚠️ PENTING: Vercel vs Bot Worker

### Vercel (Next.js App)

✅ **Cocok untuk:** Next.js web app (API routes, pages)

- Vercel akan otomatis deploy Next.js app
- API routes akan berjalan sebagai serverless functions
- **TIDAK cocok untuk:** Long-running processes seperti bot worker

### Bot Worker (`bot/run.ts`)

❌ **TIDAK akan jalan di Vercel** karena:

- Vercel adalah **serverless platform** - functions hanya jalan saat ada request
- Bot worker perlu **long-running process** (persistent connection ke Telegram)
- Vercel functions timeout setelah beberapa detik/menit
- Bot worker perlu jalan **24/7** untuk maintain connection

## 🚀 Solusi Deployment

### Opsi 1: Railway (Recommended)

Railway support long-running processes dan mudah setup.

**💰 Pricing:**

- ✅ **Trial:** $5 credit gratis untuk 30 hari pertama
- ✅ **Free Tier:** $1 credit per bulan (setelah trial)
- ⚠️ **Batasan Free Tier:**
  - RAM: 0.5 GB
  - vCPU: Shared
  - Untuk bot worker simple biasanya cukup dengan free tier

1. **Deploy Next.js ke Vercel** (seperti biasa)
2. **Deploy Bot Worker ke Railway:**

   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login
   railway login

   # Deploy
   railway init
   railway up
   ```

3. **Setup Environment Variables di Railway:**

   - `DATABASE_URL`
   - `TG_API_ID`
   - `TG_API_HASH`
   - `OPENAI_API_KEY`

4. **Setup Start Command:**
   ```json
   {
     "scripts": {
       "start": "bun run bot/run.ts"
     }
   }
   ```

### Opsi 2: Render

Similar dengan Railway, support long-running processes.

**💰 Pricing:**

- ✅ **Free Tier:** Tersedia untuk Web Services
- ⚠️ **Batasan Free Tier:**
  - Service akan sleep setelah 15 menit tidak aktif (tapi bisa auto-wake)
  - RAM: 512 MB
  - Untuk bot worker yang perlu 24/7, mungkin perlu upgrade ke paid ($7/bulan)

1. **Create Web Service di Render**
2. **Build Command:** `bun install`
3. **Start Command:** `bun run bot/run.ts`
4. **Environment Variables:** Sama seperti Railway

### Opsi 3: VPS (DigitalOcean, AWS EC2, dll)

Full control, tapi perlu manage sendiri.

1. **Setup VPS** (Ubuntu/Debian recommended)
2. **Install dependencies:**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
3. **Clone repo dan setup:**
   ```bash
   git clone <your-repo>
   cd ai-agent-userbot-mini-app
   bun install
   ```
4. **Setup PM2 untuk keep process running:**
   ```bash
   npm install -g pm2
   pm2 start "bun run bot/run.ts" --name userbot-worker
   pm2 save
   pm2 startup
   ```

### Opsi 4: Docker + Any Platform

Buat Dockerfile untuk bot worker.

**Dockerfile:**

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

CMD ["bun", "run", "bot/run.ts"]
```

## 📋 Checklist Deployment

### Next.js (Vercel)

- [ ] Deploy ke Vercel (otomatis dari GitHub)
- [ ] Setup environment variables di Vercel dashboard
- [ ] Test API routes berfungsi

### Bot Worker (Railway/Render/VPS)

- [ ] Deploy bot worker ke platform yang support long-running
- [ ] Setup environment variables
- [ ] Test bot worker jalan dan connect ke Telegram
- [ ] Setup monitoring/alerting (optional)
- [ ] Setup auto-restart jika crash

## 🔧 Environment Variables

Kedua deployment (Next.js & Bot Worker) perlu:

- `DATABASE_URL` - PostgreSQL connection string
- `TG_API_ID` - Telegram API ID
- `TG_API_HASH` - Telegram API Hash
- `OPENAI_API_KEY` - OpenAI API key untuk AI agent

## 📊 Monitoring

### Bot Worker Health Check

Bisa tambahkan health check endpoint atau monitoring:

- Railway/Render: Built-in monitoring
- VPS: Setup PM2 monitoring atau custom health check

### Logs

- Railway/Render: Built-in logs dashboard
- VPS: `pm2 logs userbot-worker`

## 💰 Perbandingan Pricing (Free Tier)

| Platform    | Free Tier          | Batasan                     | Cocok untuk Bot Worker?        |
| ----------- | ------------------ | --------------------------- | ------------------------------ |
| **Railway** | $1/bulan credit    | 0.5GB RAM, shared CPU       | ✅ Ya (cukup untuk simple bot) |
| **Render**  | Free               | Sleep setelah 15 menit idle | ⚠️ Mungkin (bisa auto-wake)    |
| **Fly.io**  | Free tier tersedia | Limited resources           | ✅ Ya                          |
| **VPS**     | Mulai $5/bulan     | Full control                | ✅ Ya (paling reliable)        |

**Rekomendasi:**

- **Coba dulu Railway** ($1/bulan setelah trial $5) - paling mudah
- **Jika butuh lebih reliable:** VPS DigitalOcean ($5/bulan) atau Render paid ($7/bulan)

## ⚡ Quick Start (Railway)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Add environment variables
railway variables set DATABASE_URL=...
railway variables set TG_API_ID=...
railway variables set TG_API_HASH=...
railway variables set OPENAI_API_KEY=...

# 5. Deploy
railway up
```

## 🎯 Summary

- **Next.js App** → Deploy ke **Vercel** ✅
- **Bot Worker** → Deploy ke **Railway/Render/VPS** ✅
- **Database** → Supabase/PostgreSQL (shared) ✅

Keduanya perlu akses ke database yang sama untuk sync data.
