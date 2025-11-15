# Userbot Worker

Userbot berjalan sebagai proses terpisah dari Next.js untuk menghindari masalah:

- Next.js hot reload restarting userbot
- Server restart menyebabkan connection drop
- ECONNRESET errors dari reconnection bursts
- Telegram long polling timeout

## Cara Menjalankan

### Development

```bash
bun run bot:dev
```

### Production

```bash
bun run bot
```

Atau langsung:

```bash
bun run bot/run.ts
```

## Fitur

1. **Auto-load enabled userbots** - Otomatis load semua user yang `userbotEnabled: true` dari database
2. **Watch for changes** - Poll setiap 30 detik untuk check userbot baru yang di-enable
3. **Graceful shutdown** - Handle SIGINT/SIGTERM untuk disconnect dengan benar
4. **Error handling** - Auto-retry dan error recovery

## Environment Variables

Pastikan file `.env` memiliki:

- `DATABASE_URL` - Connection string ke PostgreSQL
- `TG_API_ID` - Telegram API ID
- `TG_API_HASH` - Telegram API Hash
- `OPENAI_API_KEY` - Untuk AI agent (optional, jika tidak ada akan error saat generate response)

## Logs

Bot akan menampilkan:

- ✅ Userbot started successfully
- 📋 Loading enabled userbots
- 🚀 Starting userbot for user
- 🛑 Stopping disabled userbot
- ❌ Error messages

## Troubleshooting

### Bot tidak start

- Cek `DATABASE_URL` sudah benar
- Cek user sudah login dan `userbotEnabled: true`
- Cek `session` tidak null di database

### Connection drops

- Bot akan auto-reconnect (handled by Telegram client)
- Cek network connection
- Cek Telegram API tidak rate limit
