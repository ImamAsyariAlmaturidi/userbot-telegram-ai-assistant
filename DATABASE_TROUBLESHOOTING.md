# Database Connection Troubleshooting

## Masalah: Sering kena error P1001 (Can't reach database server)

Error ini biasanya terjadi karena:

1. Connection pooling tidak optimal
2. Connection timeout terlalu pendek
3. Terlalu banyak concurrent connections
4. Database server sementara tidak tersedia

## Solusi yang Sudah Diterapkan

### 1. Retry Mechanism

- Semua operasi Prisma sekarang menggunakan retry mechanism
- Auto-retry 2-3 kali dengan exponential backoff
- File: `src/lib/prisma/retry.ts`

### 2. Error Handling

- Error handling yang lebih robust di semua operasi database
- Bot tetap berjalan meski database sementara tidak tersedia
- Fallback ke default prompt jika custom prompt tidak bisa diambil

### 3. Connection Pooling

- Pastikan menggunakan Supabase Connection Pooler (port 6543)
- Gunakan parameter `?pgbouncer=true&connection_limit=10` di DATABASE_URL

## Konfigurasi DATABASE_URL yang Benar

### Untuk Supabase (Recommended)

**Gunakan Connection Pooler:**

```
DATABASE_URL="postgresql://user:password@aws-1-ap-south-1.pooler.supabase.com:6543/dbname?pgbouncer=true&connection_limit=10&connect_timeout=30"
```

**Parameter penting:**

- `pgbouncer=true` - Enable connection pooling
- `connection_limit=10` - Limit concurrent connections
- `connect_timeout=30` - Connection timeout 30 detik

### Jangan Gunakan Direct Connection

❌ Jangan gunakan direct connection (port 5432) untuk production:

```
DATABASE_URL="postgresql://user:password@aws-1-ap-south-1.pooler.supabase.com:5432/dbname"
```

## Monitoring

### Check Connection Status

Jika error masih terjadi, cek:

1. Supabase dashboard - apakah database server running?
2. Connection pool usage - apakah sudah penuh?
3. Network connectivity - apakah bisa reach database server?

### Logs

Error akan muncul di logs dengan format:

- `[Prisma Retry] Attempt X/Y failed, retrying...`
- `[getCustomPrompt] Database connection error after retries...`
- `[MessageHandler] Database connection error...`

## Best Practices

1. **Gunakan Connection Pooler** - Selalu gunakan pooler URL untuk production
2. **Limit Connections** - Set `connection_limit` sesuai kebutuhan
3. **Monitor Pool Usage** - Cek Supabase dashboard untuk pool usage
4. **Retry Logic** - Semua operasi sudah menggunakan retry mechanism
5. **Graceful Degradation** - Bot tetap berjalan meski database error

## Testing

Untuk test retry mechanism:

1. Sementara disconnect database
2. Bot akan retry beberapa kali
3. Jika masih gagal, akan fallback ke default behavior
4. Bot tetap berjalan dan merespons pesan
