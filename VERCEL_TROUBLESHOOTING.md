# Troubleshooting Vercel Deployment

## Masalah: "Minta Authorize Login Vercel" saat buka dari Telegram

### Kemungkinan Penyebab:

1. **Vercel Deployment Protection Aktif**

   - Buka Vercel Dashboard → Project → Settings → Deployment Protection
   - Pastikan **Password Protection** dan **Vercel Authentication** **DISABLED**
   - Jika enabled, ini akan meminta login Vercel sebelum akses aplikasi

2. **Cookie Settings**

   - Pastikan environment variable `NODE_ENV=production` sudah di-set di Vercel
   - Cookie akan menggunakan `sameSite: "none"` dan `secure: true` di production
   - Pastikan domain Vercel sudah benar (tidak ada typo)

3. **Environment Variables**
   Pastikan semua environment variables sudah di-set di Vercel:
   - `TG_API_ID`
   - `TG_API_HASH`
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `NODE_ENV` (otomatis `production` di Vercel)

### Cara Fix:

1. **Disable Vercel Protection:**

   ```
   Vercel Dashboard → Project → Settings → Deployment Protection
   → Disable semua protection
   ```

2. **Cek Cookie di Browser:**

   - Buka DevTools → Application → Cookies
   - Pastikan cookie `tg_session` ada
   - Pastikan `SameSite=None` dan `Secure=true`

3. **Cek Logs di Vercel:**

   - Buka Vercel Dashboard → Deployments → Logs
   - Cari error terkait cookie atau auth

4. **Test Cookie:**
   - Buka aplikasi dari Telegram
   - Login dengan nomor telepon
   - Cek apakah cookie tersimpan
   - Jika tidak, kemungkinan masalah cross-site cookie

### Catatan Penting:

- Telegram Mini App di-embed dalam iframe dari domain Telegram
- Cookie harus menggunakan `sameSite: "none"` untuk cross-site
- Cookie harus `secure: true` (HTTPS required)
- Jangan set `domain` pada cookie (biarkan browser handle)
