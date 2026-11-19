# Panduan Konversi FLAPPY FACE ke Android APK (Capacitor)

Project **FLAPPY FACE** sudah dirancang 100% kompatibel dengan **Capacitor** tanpa ketergantungan pada server backend dan tetap berjalan penuh di browser maupun Android WebView.

## 1. Prasyarat
- Node.js 18+
- Android Studio (SDK Platform 34+ & Build Tools terpasang)
- Java JDK 17

## 2. Build Web Assets
Pastikan folder `dist/` sudah dibuat dari build produksi:
```bash
npm install
npm run build
```

## 3. Install & Inisialisasi Capacitor
File `capacitor.config.json` sudah tersedia di root project dengan `webDir: "dist"` dan `androidScheme: "https"` (wajib agar `getUserMedia()` kamera berjalan dalam secure context di Android WebView!).

Install Capacitor CLI & core:
```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npm install @capacitor/android
```

Tambahkan platform Android:
```bash
npx cap add android
npx cap sync android
```

*(Opsional)* Plugin tambahan untuk pengalaman fullscreen native:
```bash
npm install @capacitor/splash-screen @capacitor/status-bar
npx cap sync android
```

## 4. Konfigurasi AndroidManifest.xml
Buka `android/app/src/main/AndroidManifest.xml`:

1. **Izin Kamera & Media**:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

2. **Orientasi Portrait & Fullscreen**:
Pada tag `<activity android:name=".MainActivity" ...>`, tambahkan:
```xml
android:screenOrientation="portrait"
android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
```

3. **WebView Camera Permission (`MainActivity.java` / `MainActivity.kt`)**:
Capacitor Android WebView menangani `onPermissionRequest` secara otomatis pada versi modern; pastikan izin kamera Android diminta saat runtime jika menargetkan Android 6.0+.

## 5. Mengubah App Icon & Splash Screen Android
Gunakan aset dari `public/pwa-512x512.png` atau tools resmi Capacitor:
```bash
npm install -D @capacitor/assets
# Taruh icon.png (1024x1024) dan splash.png (2732x2732) di folder assets/
npx capacitor-assets generate --android
```

## 6. Build APK di Android Studio
1. Jalankan:
   ```bash
   npx cap open android
   ```
2. Tunggu Gradle sync selesai.
3. **Debug APK** (untuk testing langsung di HP):
   - Pilih menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - Output berada di `android/app/build/outputs/apk/debug/app-debug.apk`.
4. **Release APK / AAB** (untuk distribusi / Play Store):
   - Pilih **Build > Generate Signed Bundle / APK...**
   - Pilih **APK** atau **Android App Bundle**, buat/pilih keystore, pilih varian `release`, dan finish.
   - Atau via CLI:
     ```bash
     cd android && ./gradlew assembleRelease
     ```
