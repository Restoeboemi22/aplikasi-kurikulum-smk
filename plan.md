# Rencana Migrasi Aplikasi Kurikulum SMK (dari Vercel)

## Latar Belakang
- Akun Vercel (Team: **Wahyu's projects**) berstatus **Paused / Pro Expired**.
- Project terdampak: `satu-pintu`, `aplikasi-kurikulum-smk`.
- Keputusan: **tidak reaktivasi Pro**, migrasi penuh ke platform lain agar tidak lagi bergantung pada langganan berbayar.

## Temuan Arsitektur Saat Ini
| Komponen | Layanan yang Dipakai | Lokasi | Status Risiko |
|---|---|---|---|
| Hosting / Deployment | Vercel | Terhubung ke GitHub (`Restoeboemi22/aplikasi-kurikulum-smk`) | Terdampak suspend |
| Autentikasi | Firebase Auth | Firebase Console (project terpisah) | Aman, independen dari Vercel |
| File upload (dokumen, submission) | Vercel Blob Store (`aplikasi-kurikulum-smk-storage`) | Nempel ke akun Vercel | **Perlu backup/pindah** |
| Database utama (User, Nilai, Kalender, dll) | PostgreSQL via **Neon** ("neon-cinereous-pebble", tier Free) terhubung lewat Prisma (`POSTGRES_PRISMA_URL`) | Neon (pihak ketiga), terintegrasi lewat Vercel Marketplace | Kemungkinan independen, tapi **wajib verifikasi & backup** |
| Framework | Next.js (App Router) | Kode di GitHub | Aman, tinggal deploy ulang |

## Tujuan Akhir
Aplikasi berjalan **gratis**, tanpa ketergantungan pada Vercel Pro, dengan data (Postgres + file upload) tetap utuh.

---

## Tahap 1 — Verifikasi & Backup (Prioritas Utama)

- [ ] Buka database **neon-cinereous-pebble** di Vercel → Storage → catat/screenshot halaman **.env.local / Connect**.
- [ ] Cek apakah database Neon ini bisa diakses langsung via **console.neon.tech** (login dengan akun yang sama) — kalau bisa, ini konfirmasi database independen dari Vercel.
- [ ] Ambil **connection string** Postgres (`POSTGRES_PRISMA_URL` atau variant non-pooling-nya).
- [ ] Jalankan backup database ke file lokal:
  ```bash
  pg_dump "CONNECTION_STRING_DI_SINI" > backup_aplikasi_kurikulum_$(date +%Y%m%d).sql
  ```
  *(Kalau `pg_dump` tidak tersedia di komputer, install dulu PostgreSQL client, atau gunakan tool GUI seperti pgAdmin / TablePlus / DBeaver.)*
- [ ] Backup isi **Blob Store** (`aplikasi-kurikulum-smk-storage`):
  - Buka Storage → Manage Blobs → download semua file satu per satu, ATAU
  - Gunakan script Node.js dengan `@vercel/blob` SDK untuk list & download semua blob otomatis.
- [ ] Simpan kedua backup (`.sql` dan folder file blob) di tempat aman (Google Drive / external disk), beri nama dengan tanggal.
- [ ] Catat semua isi **Environment Variables** project (Settings → Environment Variables) — screenshot atau copy semua key (tanpa perlu expose value sensitif ke pihak lain).

## Tahap 2 — Siapkan Infrastruktur Baru

- [ ] **Database:** Tetap pakai Neon (karena sudah gratis & independen) ATAU pindah ke provider lain (Supabase, Railway) bila ingin benar-benar lepas dari ekosistem Vercel.
  - Kalau tetap Neon: cukup pastikan project Neon tidak dihapus saat Vercel project dihapus/didowngrade.
  - Kalau pindah: buat project baru di provider baru, lalu restore dari file `.sql` hasil backup:
    ```bash
    psql "CONNECTION_STRING_BARU" < backup_aplikasi_kurikulum_TANGGAL.sql
    ```
- [ ] **File Storage:** Pilih pengganti Vercel Blob, misalnya:
  - Firebase Storage (karena Firebase Auth sudah dipakai, lebih konsisten)
  - Cloudflare R2 (gratis untuk usage kecil)
  - Upload ulang semua file hasil backup Tahap 1 ke layanan baru ini.
- [ ] **Hosting:** Pilih platform baru untuk deploy Next.js:
  - Firebase Hosting (App Hosting untuk Next.js SSR)
  - Netlify
  - Railway
  - Cloudflare Pages

## Tahap 3 — Update Kode & Konfigurasi

- [ ] Update kode yang memanggil `@vercel/blob` → ganti ke SDK storage baru (Firebase Storage / Cloudflare R2).
- [ ] Update `schema.prisma` bila pindah provider database (biasanya tetap `provider = "postgresql"`, hanya `url` yang berubah).
- [ ] Update semua Environment Variables di platform hosting baru (samakan dengan yang dicatat di Tahap 1).
- [ ] Jalankan `npx prisma generate` & test koneksi database secara lokal sebelum deploy.

## Tahap 4 — Deploy & Uji Coba

- [ ] Deploy ke platform hosting baru.
- [ ] Uji semua fitur utama:
  - [ ] Login (Admin/Teacher/Principal/Student)
  - [ ] Input & lihat nilai
  - [ ] Upload dokumen/submission
  - [ ] Kalender & jadwal
- [ ] Bandingkan data di aplikasi baru vs backup — pastikan tidak ada yang hilang.

## Tahap 5 — Pengalihan Domain & Penutupan Vercel

- [ ] Kalau pakai custom domain, arahkan DNS ke hosting baru.
- [ ] Informasikan ke pengguna (guru/siswa) bila ada perubahan URL.
- [ ] Setelah yakin semua berjalan lancar minimal beberapa hari, baru:
  - [ ] Hapus project lama di Vercel, ATAU
  - [ ] Biarkan tidak aktif (biarkan expired) tanpa perlu hapus manual.

---

## Catatan Risiko
- **Jangan hapus project atau database di Vercel** sebelum Tahap 1 (backup) selesai 100%.
- Selalu simpan minimal **2 salinan backup** (misalnya di laptop + cloud storage).
- Uji migrasi di environment terpisah/staging dulu sebelum mengganti yang production, kalau memungkinkan.

## Perkiraan Waktu
| Tahap | Estimasi Waktu |
|---|---|
| Tahap 1 (Backup) | 1–3 jam |
| Tahap 2 (Setup infra baru) | 2–4 jam |
| Tahap 3 (Update kode) | 3–6 jam |
| Tahap 4 (Deploy & test) | 2–4 jam |
| Tahap 5 (Domain & cleanup) | 1 jam + masa observasi beberapa hari |

**Total realistis: 1–2 hari kerja penuh**, tergantung kompleksitas aplikasi dan familiaritas dengan tools yang dipakai.
