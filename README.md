# FLAPPY FACE — HTML5 Arcade Game (PWA & Android Ready)

> **"One tap. Endless chaos."**

**Flappy Face** is a fun arcade flying game where your face becomes the pilot. Dodge pipes, beat your high score, and challenge your friends in local tournaments.

Developed by **Garsa Cahya Sukmana**.

---

## Fitur Utama

- **1 Player Classic**: Gameplay Flappy-style 60fps berbasis delta-time dengan sistem kesulitan bertahap (*Easy*, *Medium*, *Hard*, *Chaos*), transisi langit dinamis, partikel, dan celebration **NEW BEST!**.
- **2 Player Local & Tournament Mode**:
  - **Quick Match** (1 Ronde)
  - **Best of 3** (Target 2 kemenangan, otomatis berhenti jika sudah 2-0)
  - **Best of 5** (Target 3 kemenangan, maks 5 ronde)
  - Countdown `3-2-1-GO!`, giliran bergantian *Pass & Play*, serta *Round Result* & *Match Result* scoreboard.
- **Custom Face Character System**:
  - Kamera depan/belakang (`getUserMedia`) & import galeri (JPG, JPEG, PNG, WEBP; SVG ditolak).
  - Editor crop, zoom, rotasi, dan deteksi wajah otomatis (*FaceDetector* bila didukung).
  - Slot wajah terpisah untuk Solo, Player 1, dan Player 2 — disimpan **100% lokal di IndexedDB**.
- **Leaderboard & Win Streak**:
  - Ranking pemain lokal, *Win Streak* aktif & rekor streak, *Championships*, serta **Match History** (maks 25 pertandingan terakhir).
- **Game Over Reaction System**: 49 pesan humor Bahasa Indonesia across 8 kategori + komentar otomatis pemenang/kalah/seri di akhir pertandingan.
- **Web Audio API Synthesizer**: Efek suara original & musik latar tanpa asset audio eksternal yang berat, lengkap dengan volume slider & mute terpisah.
- **PWA Offline & Android APK Ready**: Installable sebagai aplikasi mandiri dengan Workbox caching, indikator offline, tombol Android Hardware Back support, dan konfigurasi Capacitor (`com.flappyface.game`).

---

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```
Buka `http://localhost:3000`.

### Build Produksi, Typecheck, & Automated Test
```bash
npm run lint
npm run test
npm run build
npm run preview
```

---

## Arsitektur Project

```text
src/
├── App.tsx                       # Root React container, overlay routing, & lifecycle hooks
├── index.css                     # Tailwind CSS v4 tokens, safe-area padding, & arcade buttons
├── game/
│   ├── Config.ts                 # Konstanta fisika, dunia 400x720, warna, & state types
│   ├── Game.ts                   # Engine loop utama, state machine 1P/2P/Tournament
│   ├── Input.ts                  # Penanganan pointer, touch, & keyboard (Space/ArrowUp/W)
│   ├── Physics.ts                # Integrasi gravitasi, flap impulse, & pitch rotation
│   ├── Collision.ts              # Circle-vs-rectangle collision (pipa, langit, tanah)
│   ├── Pipe.ts & PipeManager.ts  # Generator rintangan adil dengan 4 palet warna
│   ├── Player.ts                 # Renderer karakter default & custom face + animasi sayap
│   ├── Renderer.ts & Background.ts & Ground.ts & Particles.ts
│   ├── Score.ts                  # Skor real-time & high score (flappy_face_best_score)
│   ├── GameOverReaction.ts       # 49 reaksi humor Indonesia & match outcome quips
│   ├── TwoPlayerMatch.ts         # State Quick Match / BO3 / BO5 & sanitasi nama pemain
│   ├── audio/AudioManager.ts     # Web Audio API SFX & background melody synthesizer
│   ├── character/                # CameraController, GalleryController, ImageProcessor, CharacterStorage (IndexedDB)
│   ├── progression/              # AchievementManager, DifficultyManager, LeaderboardManager, StatsManager
│   ├── pwa/PWAManager.ts         # Service worker registration, install prompt, & Wake Lock
│   └── settings/                 # SettingsManager & VibrationManager
└── ui/
    ├── MainMenu.tsx              # Menu utama dengan 1 Player, 2 Player, Tournament, Leaderboard, dll.
    ├── TwoPlayerSetup.tsx        # Lobby setup nama, slot wajah, & pilih format pertandingan
    ├── LeaderboardUI.tsx         # Ranking Top Players, Win Streak, & Match History
    ├── RoundResultOverlay.tsx    # Ringkasan skor antar ronde turnamen
    ├── MatchResultOverlay.tsx    # Podium juara, streak badge, reaksi, & breakdown ronde
    ├── CharacterCustomization.tsx & PhotoEditorModal.tsx
    ├── AchievementCollectionUI.tsx, StatsUI.tsx, SettingsUI.tsx, AboutPanel.tsx, PrivacyModal.tsx
    └── CountdownOverlay.tsx, TurnTransitionOverlay.tsx, TwoPlayerGameOverOverlay.tsx, GameOverOverlay.tsx, PauseOverlay.tsx
tests/
└── run-tests.ts                  # Automated unit & state-machine integration test suite
```

---

## Privasi & Penyimpanan Lokal

Semua foto wajah, pengaturan, pencapaian, statistik, dan leaderboard disimpan **hanya di perangkat pengguna** (`IndexedDB` dan `localStorage`) dengan skema berversi:
- `IndexedDB`: `flappy_face_db` (foto wajah terpisah untuk Solo, Player 1, dan Player 2 — tidak pernah di-cache oleh Service Worker).
- `localStorage`: `flappy_face_best_score`, `flappy_face_achievements`, `flappy_face_stats`, `flappy_face_settings`, `flappy_face_leaderboard`, `flappy_face_2p_names`, plus metadata karakter.

Pengguna dapat menghapus seluruh data lokal melalui **Settings → Reset All Data**.

---

## Deployment & Build APK Android

Lihat panduan lengkap deployment ke **Vercel**, **Netlify**, **GitHub Pages**, dan build **APK Android (Capacitor)** di [`DEPLOYMENT.md`](./DEPLOYMENT.md) dan [`capacitor/README.md`](./capacitor/README.md).
