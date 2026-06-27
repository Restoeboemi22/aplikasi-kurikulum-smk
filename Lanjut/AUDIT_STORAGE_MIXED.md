# Audit Storage Campuran

Tanggal audit terakhir: 2026-06-25

## Ringkasan

Batch migrasi inti sekarang sudah jauh lebih seragam.
Modul yang sebelumnya paling bermasalah sudah berhasil dipindah ke pola:

- `Next.js page -> fetch API -> Prisma -> PostgreSQL`
- role dan profil aplikasi dari `prisma.user`
- otorisasi API dari session server-side

Modul inti yang **sudah tidak lagi campur Firebase/local state untuk data operasional utamanya**:

- `app/jurnal-mengajar/page.tsx`
- `app/kelola-akun/page.tsx`
- `app/dashboard/page.tsx`
- `app/jadwal-piket-kelas/page.tsx`
- `app/jadwal-piket-keagamaan/page.tsx`
- `app/jadwal-pelajaran-ai/page.tsx`
- `app/kurikulum-perangkat-pembelajaran/page.tsx`
- `app/kurikulum-perangkat-penilaian/page.tsx`
- seluruh alur nilai dan master data admin

Masih ada beberapa modul non-inti yang belum dimigrasi penuh dan masih perlu dirapikan agar sepenuhnya seragam dengan prinsip single source of truth.

---

## Status Terbaru Per Kategori

## 1. Sudah Seragam Server-Side

### Master data admin

- `app/siswa/page.tsx`
- `app/guru/page.tsx`
- `app/kelas-jurusan/page.tsx`
- `app/mata-pelajaran/page.tsx`

Status:

- Sudah memakai API dan Prisma
- Sudah dibatasi role `ADMIN` untuk aksi tulis/hapus

### Penilaian

- `app/penilaian-uh/page.tsx`
- `app/penilaian-tugas/page.tsx`
- `app/penilaian-sts/page.tsx`
- `app/penilaian-sas/page.tsx`
- `app/penilaian-sikap/page.tsx`
- `app/master-nilai/page.tsx`
- `app/guru/page.tsx` pada panel lihat nilai siswa

Status:

- Sudah memakai sumber data server-side yang sama
- Sudah menyimpan `teacherId` asli
- Sudah memakai filter mapel, semester, dan tahun ajaran
- Sudah dibatasi per guru aktif pada sisi API dan UI terkait

### Jurnal

- `app/jurnal-mengajar/page.tsx`
- `app/api/journals/route.ts`

Status:

- Sudah lepas dari Firestore
- Sudah tersimpan ke PostgreSQL
- Sudah memakai relasi `teacherId` dan `userId`
- Sudah memakai filter semester dan tahun ajaran

### Kelola akun

- `app/kelola-akun/page.tsx`
- `app/api/users/route.ts`

Status:

- Sudah lepas dari Firebase client / Firestore untuk daftar akun dan role
- Sudah memakai `prisma.user` sebagai sumber data akun
- Sudah ada proteksi delete terhadap akun yang terhubung ke guru/nilai/jurnal

### Dashboard

- `app/dashboard/page.tsx`
- `app/api/dashboard/summary/route.ts`
- `app/page.tsx` untuk landing page guru

Status:

- Sudah lepas dari statistik hardcoded dan `localStorage.clear()`
- Sudah membaca data server-side yang sama
- Landing page guru sudah tidak berhenti di halaman kosong, tetapi menampilkan sambutan personal
- Sambutan guru sudah memakai logo sekolah dari asset root project

### Jadwal dan monitoring

- `app/jadwal-piket-kelas/page.tsx`
- `app/api/class-picket-schedules/route.ts`
- `app/api/class-picket-reports/route.ts`
- `app/jadwal-piket-keagamaan/page.tsx`
- `app/api/religious-picket-schedules/route.ts`
- `app/api/religious-picket-reports/route.ts`
- `app/jadwal-pelajaran-ai/page.tsx`
- `app/api/ai-schedule-config/route.ts`

Status:

- `Jadwal Piket Kelas` sudah lepas dari penyimpanan browser lokal
- `Monitoring Piket Kelas` admin sudah membaca laporan guru dari database
- Detail ikon mata pada monitoring piket kelas sudah memakai data pelaksanaan yang sama dengan halaman guru
- `Jadwal Piket Keagamaan` sudah lepas dari penyimpanan browser lokal
- `Monitoring Piket Keagamaan` admin sudah membaca laporan guru dari database
- `Jadwal Pelajaran AI` sudah menyimpan konfigurasi ke database
- Preview dan export `Jadwal AI` sudah mengikuti master `Kelas-Jurusan`, bukan hardcode kelas

### Perangkat kurikulum

- `app/kurikulum-perangkat-pembelajaran/page.tsx`
- `app/kurikulum-perangkat-penilaian/page.tsx`
- `app/api/curriculum-submissions/route.ts`

Status:

- Sumber `guru`, `kelas`, dan `mata pelajaran` sudah dibaca dari API aplikasi
- Submission dan activity sudah lepas dari `localStorage`
- Monitoring admin dan verifikasi sudah membaca data database yang sama
- Filter jurusan sudah mengikuti master kelas
- Upload file perangkat sudah aktif di sisi UI

---

## 2. Masih Bergantung Pada Firebase

Ketergantungan Firebase saat ini tinggal pada lapisan login, bukan lagi pada data bisnis inti.

### Login / session bootstrap

- `app/login/page.tsx`
- `lib/auth-context.tsx`
- `app/api/auth/session/route.ts`
- `app/api/auth/me/route.ts`
- `lib/server-session.ts`

Status:

- Firebase Auth masih dipakai untuk autentikasi awal user
- Setelah login, server membuat session cookie sendiri
- Role dan profil tidak lagi diambil dari Firestore client

Kesimpulan:

- **Dependency Firebase masih ada**
- tetapi **ketergantungan Firebase terhadap role/user aplikasi inti sudah berhasil dikurangi besar**

---

## 3. Masih State Lokal / Data Dummy

### Kurikulum

- `app/kurikulum/page.tsx`
  - Masih memakai data lokal/statis
  - Filter semester dan tahun ajaran sudah diseragamkan
  - Prioritas migrasi: tinggi

### Jadwal

- Tidak ada temuan besar tersisa pada `jadwal-piket-kelas`, `jadwal-piket-keagamaan`, dan `jadwal-pelajaran-ai` untuk storage transaksi utama
- Area yang masih perlu diawasi hanya penyempurnaan fitur dan konsistensi UX, bukan lagi migrasi sumber data utama

### Jurnal non-inti

- `app/buku-pembinaan/page.tsx`
  - Belum ikut diseragamkan ke API/database inti
  - Prioritas migrasi: sedang

---

## 4. Prioritas Lanjutan Setelah Batch Ini

1. Migrasi modul `kurikulum` ke API + PostgreSQL
2. Migrasi `buku-pembinaan`
3. Tentukan strategi jangka panjang auth:
   - tetap Firebase Auth sebagai identity provider
   - atau pindah penuh ke auth internal / provider lain

---

## 5. Catatan Teknis Penting

- Session server-side sudah aktif dan menjadi fondasi otorisasi API
- Build production terbaru berhasil setelah `prisma db push` ke PostgreSQL cloud
- Alias production aktif di `https://aplikasi-kurikulum-smk.vercel.app`
- Build production terbaru juga sudah lolos setelah perbaikan type Prisma pada `ai-schedule-config` dan typing state pada `jadwal-piket-keagamaan`
- Opsi jurusan aplikasi sekarang dibatasi ke `TKJ` dan `TKR`; `RPL` dan `DKV` sudah dihapus dari UI dan ditolak oleh API `class-majors`
- Pengecekan database aktif menunjukkan tidak ada sisa data `RPL` / `DKV` pada `ClassMajor` dan `Student`
- Audit ini harus dianggap **setelah batch raport + TP + DKN + migrasi storage jadwal/perangkat selesai**

---

## 6. Kesimpulan

Fase "storage campuran" untuk modul inti praktis sudah terselesaikan.

Yang masih campur sekarang terutama:

- login bootstrap berbasis Firebase Auth
- modul `kurikulum` umum
- buku pembinaan

Dengan kata lain, risiko inkonsistensi terbesar sekarang bukan lagi di nilai, jurnal, akun, dashboard, jadwal, perangkat, raport, atau DKN, melainkan pada modul umum yang belum dimigrasikan penuh dan pada strategi auth jangka panjang.
