# FLAPPY FACE — Deployment & Android APK Guide

Project **FLAPPY FACE** adalah aplikasi web statis (Vite + React + HTML5 Canvas + PWA Workbox) yang tidak memerlukan server backend. Semua data berjalan lokal di perangkat pemain.

---

## 1. Verifikasi Pra-Deploy

Jalankan seluruh pengecekan sebelum mengunggah build produksi:

```bash
npm install
npm run lint
npm run test
npm run build
```

Pastikan folder `dist/` menghasilkan:
- `dist/index.html`
- `dist/manifest.json`
- `dist/service-worker.js`
- `dist/offline.html`
- `dist/pwa-192x192.png`, `dist/pwa-512x512.png`, `dist/pwa-maskable-512x512.png`, `dist/apple-touch-icon.png`, `dist/icon.svg`

---

## 2. Deploy ke Vercel

File konfigurasi [`vercel.json`](./vercel.json) sudah tersedia (SPA rewrite + header `must-revalidate` untuk `service-worker.js` dan `manifest.json`).

### Via Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

### Via Git Dashboard:
1. Import repository di [vercel.com](https://vercel.com).
2. Framework Preset: **Vite** (`Build Command: npm run build`, `Output Directory: dist`).
3. Deploy — HTTPS dan akses kamera `getUserMedia()` langsung aktif.

---

## 3. Deploy ke Netlify

File konfigurasi [`netlify.toml`](./netlify.toml) sudah tersedia (`publish = "dist"`, redirect SPA `/* -> /index.html`, dan cache headers).

### Via Netlify CLI:
```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Via Drag & Drop / Git:
1. Hubungkan repository di [app.netlify.com](https://app.netlify.com), atau drag & drop folder `dist/` ke Netlify Drop.

---

## 4. Deploy ke GitHub Pages

Karena GitHub Pages umumnya melayani project di subpath (`https://<username>.github.io/<repo-name>/`), gunakan environment variable `VITE_BASE_PATH`:

```bash
VITE_BASE_PATH=/flappy-face/ npm run build
```

Kemudian publish isi folder `dist/` ke branch `gh-pages` (misalnya memakai `gh-pages -d dist` atau GitHub Actions workflow resmi `actions/deploy-pages`).

*(Catatan: Untuk root custom domain seperti `https://flappyface.example/`, cukup jalankan `npm run build` biasa dengan base `/`.)*

---

## 5. Build Android APK / AAB (Capacitor)

Konfigurasi [`capacitor.config.json`](./capacitor.config.json) sudah terpasang dengan:
- `appId`: `"com.flappyface.game"`
- `appName`: `"FLAPPY FACE"`
- `webDir`: `"dist"`
- `server.androidScheme`: `"https"` (wajib agar akses kamera `getUserMedia()` di Android WebView berjalan di Secure Context)

> **Catatan Lingkungan**: Kompilasi `.apk` / `.aab` native membutuhkan **Android Studio + Android SDK + Java JDK 17** di mesin lokal (tidak dapat dijalankan di container web tanpa Android SDK).

### Langkah Lengkap Build APK:
```bash
# 1. Build web bundle terbaru
npm run build

# 2. Pasang Capacitor (jika belum terpasang di node_modules)
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli

# 3. Inisialisasi / sinkronisasi project Android
npx cap add android        # lewati jika folder android/ sudah ada
npx cap sync android

# 4. Buka di Android Studio untuk build Debug APK / Signed Release APK
npx cap open android
```

Untuk konfigurasi izin kamera (`android.permission.CAMERA`), orientasi portrait, dan ikon adaptif di `AndroidManifest.xml`, ikuti langkah detail di [`capacitor/README.md`](./capacitor/README.md).
