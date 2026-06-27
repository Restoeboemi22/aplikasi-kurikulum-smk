# Resume Progres - Aplikasi Kurikulum SMK

Terakhir diperbarui: 25 Juni 2026

Dokumen ini merangkum progres aktual proyek sampai deploy production terbaru, agar sesi berikutnya bisa langsung lanjut tanpa mengulang analisis dari nol.

> Catatan untuk sesi mendatang: minta AI membaca file ini, `Lanjut/ARSITEKTUR_SISTEM_MASTER_APLIKASI.md`, dan `Lanjut/AUDIT_STORAGE_MIXED.md`.

---

## 1. Tujuan Besar Proyek

Target utama aplikasi:

- semua data inti memakai satu database server-side
- admin dan guru membaca data operasional yang sama dari server
- role dan identitas user tidak bergantung pada payload frontend
- modul jadwal, monitoring, kurikulum, dan laporan bergerak ke pola `API -> Prisma -> PostgreSQL`

---

## 2. Status Singkat Saat Ini

Status per 25 Juni 2026:

- Production aktif di `https://aplikasi-kurikulum-smk.vercel.app`
- Database utama sudah memakai PostgreSQL cloud dari Neon / Vercel
- Build production terbaru berhasil
- `prisma db push` ke PostgreSQL berhasil
- Session server-side sudah menjadi fondasi auth API
- Login guru aktif memakai username tanggal lahir format `ddmmyyyy` dan password default `guru123`
- Modul `jurnal-mengajar`, `kelola-akun`, `dashboard`, `jadwal piket kelas`, `jadwal piket keagamaan`, `jadwal pelajaran AI`, `perangkat pembelajaran`, dan `perangkat penilaian` sudah berada di jalur server-side
- Monitoring admin untuk `Piket Kelas` dan `Piket Keagamaan` sudah membaca data pelaksanaan guru dari database
- `Jadwal Pelajaran AI` sudah menyimpan konfigurasi ke database dan preview/export kelas mengikuti master `Kelas-Jurusan`
- `Perangkat Pembelajaran` dan `Perangkat Penilaian` sudah menyimpan submission dan activity ke database
- Form kurikulum guru membatasi nama guru, mapel, dan kelas-jurusan sesuai penugasan guru aktif
- Upload file pada `perangkat pembelajaran` dan `perangkat penilaian` sudah aktif di UI
- Opsi jurusan `RPL` dan `DKV` sudah dihapus dari UI dan ditolak di API
- Pengecekan database aktif menunjukkan tidak ada data lama `RPL` / `DKV` yang tersisa
- Menu laporan sudah dipisah menjadi `Cetak Raport TKJ`, `Cetak Raport TKR`, dan `Cetak DKN`
- Data siswa sudah memiliki `NISN` 10 digit dan dipakai pada form, tabel, raport, dan DKN
- Data master yang saat ini paling siap untuk uji end-to-end masih dominan jalur `TKJ`; jalur `TKR` sudah siap struktur tetapi masih menunggu data riil yang lebih lengkap

---

## 3. Keputusan Arsitektur yang Sudah Final

| Hal | Keputusan aktif |
|---|---|
| Frontend | Next.js 15 App Router + React 19 + TypeScript |
| Backend | Next.js API Routes |
| ORM | Prisma |
| Database utama | PostgreSQL cloud |
| Auth login | Firebase Auth |
| Role aplikasi | Prisma User + session server-side |
| Otorisasi API | Cookie session httpOnly + guard server-side |
| Deploy | Vercel |

Catatan penting:

- Firebase masih dipakai untuk login awal
- Firebase tidak lagi menjadi sumber role/user utama aplikasi
- Session server menggunakan `prisma.user.id` sebagai identitas user aktif
- Relasi operasional guru dibaca melalui data `Teacher`

---

## 4. Yang Sudah Selesai

## 4.1 Database inti dan deploy

- Migrasi dari SQLite lokal ke PostgreSQL cloud berhasil
- Prisma schema aktif sudah sinkron ke database cloud
- Build Vercel disetel menjalankan:
  - `prisma generate`
  - `prisma db push`
  - `next build`
- Deploy production terbaru berhasil dan alias utama sudah aktif

## 4.2 Session server-side dan login

- Dibuat session cookie httpOnly untuk API internal
- Dibuat endpoint:
  - `/api/auth/session`
  - `/api/auth/me`
- `lib/auth-context.tsx` sekarang:
  - login via Firebase
  - sinkron session ke server
  - baca profil dari `/api/auth/me`
- Rule login guru sudah disamakan menjadi:
  - username: tanggal lahir format `ddmmyyyy`
  - password default: `guru123`
- Akun guru lama sudah disinkronkan ke pola username baru

## 4.3 Master data admin

Sudah memakai API + Prisma:

- `/api/students`
- `/api/teachers`
- `/api/class-majors`
- `/api/subjects`
- `/api/users`
- `/api/teaching-objectives`
- `/api/dkn/options`
- `/api/dkn/preview`
- `/api/report-cards/options`
- `/api/report-cards/preview`
- `/api/report-cards/supplement`

Sudah aktif proteksi role admin untuk operasi tulis/hapus.

## 4.4 Penilaian dan laporan

Semua halaman penilaian inti sudah terkoneksi ke data riil:

- `penilaian-uh`
- `penilaian-tugas`
- `penilaian-sts`
- `penilaian-sas`
- `penilaian-sikap`
- `master-nilai`

Yang sudah dibereskan:

- input nilai menyimpan `teacherId` asli
- nilai terkait `userId` dan guru aktif
- panel guru hanya menampilkan nilai yang benar-benar dibuat guru itu
- filter mapel menjadi filter riil
- filter semester dan tahun ajaran sudah aktif
- API nilai memvalidasi role guru, mapel, dan relasi kelas/jurusan

### TP dan deskripsi raport

Sudah selesai:

- `TP (Tujuan Pembelajaran)` tersedia untuk semua guru
- admin bisa memonitor TP seluruh guru
- guru bisa reset TP per mapel-kelas-periode
- deskripsi CP di raport otomatis dibentuk dari TP + rentang nilai

### Cetak Raport

Sudah selesai:

- menu `Cetak Raport` dipisah menjadi `Cetak Raport TKJ` dan `Cetak Raport TKR`
- akses guru ke raport tetap dibatasi hanya untuk `wali kelas`
- preview raport mendukung filter tahun ajaran, semester, kelas, siswa
- data pelengkap, tanda tangan, finalisasi, header `KOP SMK.png`, dan layout A4 sudah aktif
- identitas `NISN` sudah tampil di raport

### Cetak DKN

Sudah selesai:

- halaman `Cetak DKN` aktif di menu `Laporan`
- tersedia filter tahun ajaran, semester, dan kelas
- preview tabel mengikuti pola `DKN.xlsx`
- print landscape dan export Excel sudah aktif
- `NISN` siswa sudah ikut dipakai di DKN

## 4.5 Migrasi jurnal mengajar

Sudah selesai:

- `app/jurnal-mengajar/page.tsx` tidak lagi memakai Firestore
- backend baru tersedia di `/api/journals`
- jurnal tersimpan ke PostgreSQL
- jurnal memakai relasi `teacherId` dan `userId`
- filter semester dan tahun ajaran aktif
- form guru sekarang berbasis relasi guru nyata, bukan nama bebas

## 4.6 Migrasi kelola akun

Sudah selesai:

- `app/kelola-akun/page.tsx` tidak lagi memakai Firebase client / Firestore untuk daftar akun dan role
- backend baru tersedia di `/api/users`
- create, update, delete akun sudah berjalan via Prisma
- role user sekarang dibaca dari server-side source yang sama
- masalah stale data saat edit/hapus akun yang sudah hilang sudah diperbaiki

## 4.7 Migrasi dashboard

Sudah selesai:

- `app/dashboard/page.tsx` tidak lagi memakai data statis
- dashboard membaca `/api/dashboard/summary`
- statistik, aktivitas terbaru, dan status integrasi membaca data server-side yang sama
- tombol reset `localStorage` sudah dihapus

## 4.8 Jadwal dan monitoring

Sudah selesai:

- `Jadwal Piket Kelas` sudah memakai `/api/class-picket-schedules`
- laporan guru `Piket Kelas` sudah memakai `/api/class-picket-reports`
- Monitoring Piket Kelas admin membaca status riil dari database
- ikon mata pada Monitoring Piket Kelas menampilkan detail read-only seperti format guru
- `Jadwal Piket Keagamaan` sudah memakai `/api/religious-picket-schedules`
- laporan guru `Piket Keagamaan` sudah memakai `/api/religious-picket-reports`
- Monitoring Piket Keagamaan admin membaca hasil pelaksanaan dari database
- `Jadwal Pelajaran AI` sudah memakai `/api/ai-schedule-config`
- konfigurasi `Jadwal AI` tidak lagi tergantung browser lokal
- preview dan export `Jadwal AI` sudah mengikuti master `Kelas-Jurusan`

## 4.9 Perangkat kurikulum

Sudah selesai:

- `Perangkat Pembelajaran` memakai `/api/curriculum-submissions?category=learning`
- `Perangkat Penilaian` memakai `/api/curriculum-submissions?category=assessment`
- submission dan activity tidak lagi disimpan di `localStorage`
- verifikasi admin tercatat sebagai activity di database
- filter jurusan pada monitoring mengikuti data master kelas

---

## 5. Yang Sudah Diverifikasi Teknis

Yang sudah dibuktikan berhasil:

- diagnostics file yang diedit bersih
- `npx prisma db push` berhasil ke Neon / Vercel Postgres
- `npm run vercel-build` berhasil penuh
- deploy production berhasil
- build terbaru lolos setelah migrasi `Jadwal AI`, `Piket Keagamaan`, `Perangkat Pembelajaran`, dan `Perangkat Penilaian`
- build sebelumnya juga lolos setelah pembatasan jurusan `TKJ/TKR` dan refactor halaman shared raport

URL penting:

- Production utama: `https://aplikasi-kurikulum-smk.vercel.app`

---

## 6. Yang Belum Selesai

Modul yang masih perlu migrasi lanjutan:

- `app/kurikulum/page.tsx`
- `app/buku-pembinaan/page.tsx`

Masalah yang masih tersisa secara arsitektur:

- Firebase masih dipakai sebagai identity provider saat login
- belum ada strategi final untuk provisioning akun login Firebase jika akun aplikasi dibuat dari panel admin
- beberapa modul non-inti masih bisa dirapikan lagi agar sepenuhnya seragam dengan prinsip single source of truth

---

## 7. Prioritas Lanjutan Paling Masuk Akal

Urutan kerja berikutnya yang direkomendasikan:

1. Migrasi modul `kurikulum` umum ke API + PostgreSQL
2. Migrasi `buku-pembinaan`
3. Rapikan strategi auth jangka panjang
4. Tambah smoke test manual admin/guru berbasis data riil di browser production

---

## 8. Cara Kerja Saat Ini

### Login

1. User login di halaman login
2. Firebase Auth memverifikasi akun
3. Server membuat session cookie
4. Profil user dibaca dari `/api/auth/me`

### Menambah atau mengubah akun

1. Admin buka `Kelola Akun`
2. Data akun dibaca dari `/api/users`
3. Role dan profil disimpan ke database aplikasi

### Mengisi jurnal

1. Guru buka `Jurnal Mengajar`
2. Form jurnal mengirim data ke `/api/journals`
3. Jurnal tersimpan ke PostgreSQL dan langsung muncul di monitoring

### Mengisi nilai

1. Guru buka salah satu halaman penilaian
2. Pilih kelas, jurusan, mapel, semester, tahun ajaran
3. Isi nilai lalu kirim
4. Data tersimpan per guru aktif dan tampil di `Master Nilai`

### Mengelola piket kelas dan keagamaan

1. Admin membuat jadwal melalui API schedule
2. Guru membuka jadwal yang sama dari akun masing-masing
3. Guru mengirim status pelaksanaan dan catatan ke API report
4. Admin memonitor hasil riil dari database yang sama

### Mengelola perangkat kurikulum

1. Guru submit perangkat pembelajaran atau penilaian
2. Data masuk ke `/api/curriculum-submissions`
3. Admin memverifikasi dari monitoring
4. Riwayat activity tersimpan di database

### Melihat dashboard

1. Admin buka `Dashboard`
2. Statistik dibaca dari `/api/dashboard/summary`
3. Data aktivitas dan ringkasan tampil dari server

---

## 9. Cara Menjalankan Lokal

Minimal environment:

- `.env`
- `.env.local`
- `POSTGRES_PRISMA_URL`
- `DATABASE_URL`
- Firebase env untuk login

Perintah utama:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Untuk simulasi build production:

```bash
npm run vercel-build
```

Untuk deploy production:

```bash
npx vercel --prod --yes
```

---

## 10. Identitas Penting

- Path proyek: `E:\Chayanku\Aplikasi Kurikulum`
- Folder dokumentasi: `E:\Chayanku\Aplikasi Kurikulum\Lanjut`
- Dokumen arsitektur: `Lanjut/ARSITEKTUR_SISTEM_MASTER_APLIKASI.md`
- Dokumen audit: `Lanjut/AUDIT_STORAGE_MIXED.md`
- URL production: `https://aplikasi-kurikulum-smk.vercel.app`

---

## 11. Ringkasan Satu Kalimat

Modul inti aplikasi sekarang sudah berada di jalur `Next.js + API + Prisma + PostgreSQL + session server-side`, termasuk jadwal dan perangkat kurikulum yang sebelumnya masih lokal, sedangkan sisa pekerjaan terbesar tinggal merapikan `kurikulum` umum, `buku pembinaan`, dan strategi auth jangka panjang.
