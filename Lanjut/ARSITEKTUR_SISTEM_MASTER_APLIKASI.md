# ARSITEKTUR SISTEM MASTER - APLIKASI KURIKULUM SMK

> **Versi:** 5.0.0
> **Platform:** Next.js + Prisma + PostgreSQL + Firebase Auth + server-side session
> **Status:** Production aktif di `https://aplikasi-kurikulum-smk.vercel.app`
> **Tanggal diperbarui:** 25 Juni 2026

---

## 1. Ringkasan Arsitektur Saat Ini

Arsitektur aplikasi saat ini sudah bergeser dari pola campuran `Firebase + Firestore + localStorage` menjadi pola yang lebih konsisten:

- **Next.js 15 App Router** untuk seluruh halaman aplikasi
- **Next.js API Routes** sebagai backend utama untuk CRUD, monitoring, dan agregasi
- **Prisma ORM** sebagai lapisan akses data
- **PostgreSQL cloud (Neon / Vercel)** sebagai sumber data tunggal
- **Signed session cookie httpOnly** sebagai otorisasi server-side
- **Firebase Auth** dipakai sebagai identity provider saat login, bukan sumber role maupun data bisnis utama

Per Juni 2026, modul penting yang sebelumnya masih lokal sudah dipindahkan ke jalur server-side:

- `Jadwal Piket Kelas` memakai `ClassPicketSchedule` dan `ClassPicketReport`
- `Jadwal Piket Keagamaan` memakai `ReligiousPicketSchedule` dan `ReligiousPicketReport`
- `Jadwal Pelajaran AI` menyimpan konfigurasi ke `AIScheduleConfig`
- `Perangkat Pembelajaran` dan `Perangkat Penilaian` menyimpan transaksi ke `CurriculumSubmission` dan `CurriculumActivity`

Perubahan penting dibanding fase lama:

| Aspek | Implementasi lama | Implementasi saat ini |
|---|---|---|
| Database utama | SQLite lokal / data browser | PostgreSQL cloud |
| Sumber role/profile | Firebase client / Firestore | `prisma.user` + session server-side |
| Otorisasi API | Payload frontend / client trust | Cookie session httpOnly + validasi role server-side |
| Jadwal AI | `localStorage` + hardcode kelas | `/api/ai-schedule-config` + master `class-majors` |
| Piket Kelas | Browser local | `/api/class-picket-schedules` + `/api/class-picket-reports` |
| Piket Keagamaan | Browser local / placeholder | `/api/religious-picket-schedules` + `/api/religious-picket-reports` |
| Perangkat Kurikulum | `localStorage` | `/api/curriculum-submissions` + PostgreSQL |
| Dashboard | Data statis / lokal | `/api/dashboard/summary` |
| Jurnal Mengajar | Firestore | `/api/journals` + PostgreSQL |
| Kelola Akun | Firebase client | `/api/users` + PostgreSQL |
| Raport | Belum ada modul aktif | `/api/report-cards/*` + shared engine |
| DKN | File Excel manual | `/api/dkn/*` + preview + export |

---

## 2. Tujuan Sistem

- Memusatkan data akademik, kurikulum, jadwal, dan monitoring dalam satu sumber data
- Memastikan admin dan guru membaca data realtime yang sama dari server
- Menghapus ketergantungan pada `localStorage`, dummy data, dan Firestore untuk modul inti
- Menjaga role, identitas, dan hak akses di backend, bukan hanya di UI
- Menyederhanakan deploy dengan alur `Prisma -> Next build -> Vercel`

---

## 3. Arsitektur Lapisan

```text
Pengguna
  |- Admin
  |- Teacher
        |
Browser / Client App
        |
Next.js App Router
  |- halaman admin
  |- halaman guru
  |- auth-context.tsx
        |
Next.js API Routes
  |- /api/auth/session
  |- /api/auth/me
  |- /api/students
  |- /api/teachers
  |- /api/class-majors
  |- /api/subjects
  |- /api/grades
  |- /api/journals
  |- /api/users
  |- /api/dashboard/summary
  |- /api/teaching-objectives
  |- /api/class-picket-schedules
  |- /api/class-picket-reports
  |- /api/religious-picket-schedules
  |- /api/religious-picket-reports
  |- /api/ai-schedule-config
  |- /api/curriculum-submissions
  |- /api/dkn/options
  |- /api/dkn/preview
  |- /api/report-cards/options
  |- /api/report-cards/preview
  |- /api/report-cards/supplement
        |
Server-side session + role guard
        |
Prisma ORM
        |
PostgreSQL (Neon / Vercel)
```

---

## 4. Autentikasi dan Otorisasi

## 4.1 Sumber Identitas

Alur identitas login saat ini:

1. User login melalui **Firebase Auth**
2. Client mengirim **Firebase ID token** ke `/api/auth/session`
3. Server memverifikasi token lalu memetakan user ke tabel `User` Prisma
4. Server membuat **cookie session httpOnly**
5. Semua API internal membaca session itu melalui `requireSession()` dan `requireRole()`

Artinya:

- **Firebase tidak lagi menjadi sumber kebenaran role**
- Role akhir dibaca dari **`prisma.user.role`**
- `session.uid` merepresentasikan **`prisma.user.id`**, bukan Firebase UID mentah
- Data operasional guru dibaca melalui relasi `User -> Teacher`

## 4.2 Aturan Login Guru Aktif

Aturan login guru yang berlaku saat ini:

- Username guru: **tanggal lahir format `ddmmyyyy`**
- Password default guru: **`guru123`**
- Mapping identitas login dibantu helper di `lib/user-identity.ts` dan `lib/firebase-auth-rest.ts`
- Akun guru lama sudah mengikuti pola sinkronisasi username berbasis tanggal lahir

Catatan:

- Password Firebase lama tidak dapat dibaca ulang dari aplikasi
- Jika akun guru bermasalah, pendekatan yang benar adalah reset / sinkronisasi ulang, bukan membaca password lama

## 4.3 Role Sistem

| Role | Fungsi |
|---|---|
| `ADMIN` | Kelola master data, akun, konfigurasi, monitoring, dan seluruh data lintas guru |
| `TEACHER` | Input nilai, jurnal, perangkat, dan pelaksanaan piket sesuai relasi guru aktif |

## 4.4 Proteksi API

Proteksi formal yang sudah aktif mencakup:

- `lib/server-session.ts`
- `/api/grades`
- `/api/students`
- `/api/teachers`
- `/api/class-majors`
- `/api/subjects`
- `/api/journals`
- `/api/users`
- `/api/dashboard/summary`
- `/api/class-picket-schedules`
- `/api/class-picket-reports`
- `/api/religious-picket-schedules`
- `/api/religious-picket-reports`
- `/api/ai-schedule-config`
- `/api/curriculum-submissions`

API inti tidak lagi mempercayai `teacherId`, `role`, atau identitas yang hanya datang dari payload frontend.

---

## 5. Struktur Kode Penting

```text
app/
  api/
    ai-schedule-config/route.ts
    auth/
      me/route.ts
      session/route.ts
    class-majors/route.ts
    class-picket-reports/route.ts
    class-picket-schedules/route.ts
    curriculum-submissions/route.ts
    dashboard/summary/route.ts
    dkn/
      options/route.ts
      preview/route.ts
    grades/route.ts
    journals/route.ts
    religious-picket-reports/route.ts
    religious-picket-schedules/route.ts
    report-cards/
      options/route.ts
      preview/route.ts
      supplement/route.ts
    students/route.ts
    subjects/route.ts
    teachers/route.ts
    teaching-objectives/route.ts
    users/route.ts
  cetak-dkn/page.tsx
  dashboard/page.tsx
  guru/page.tsx
  jadwal-pelajaran-ai/page.tsx
  jadwal-piket-keagamaan/page.tsx
  jadwal-piket-kelas/page.tsx
  jurnal-mengajar/page.tsx
  kelola-akun/page.tsx
  kurikulum-perangkat-pembelajaran/page.tsx
  kurikulum-perangkat-penilaian/page.tsx
  master-nilai/page.tsx
  penilaian-raport/page.tsx
  penilaian-raport-tkj/page.tsx
  penilaian-raport-tkr/page.tsx
  penilaian-sas/page.tsx
  penilaian-sikap/page.tsx
  penilaian-sts/page.tsx
  penilaian-tugas/page.tsx
  penilaian-uh/page.tsx
  siswa/page.tsx
  tujuan-pembelajaran/page.tsx

lib/
  ai-schedule.ts
  auth-context.tsx
  class-major-options.ts
  class-picket.ts
  current-teacher.ts
  curriculum-submissions.ts
  firebase-auth-rest.ts
  grade-period.ts
  permissions.ts
  prisma.ts
  religious-picket.ts
  report-profiles.ts
  server-session.ts
  user-identity.ts

prisma/
  schema.prisma

Lanjut/
  ARSITEKTUR_SISTEM_MASTER_APLIKASI.md
  AUDIT_STORAGE_MIXED.md
  RESUME_PROGRES.md
```

## 5.1 Berkas Kunci

| Berkas | Peran |
|---|---|
| `lib/server-session.ts` | Membuat, memverifikasi, dan membaca session cookie server-side |
| `lib/auth-context.tsx` | Sinkron login Firebase ke session server dan baca `/api/auth/me` |
| `lib/user-identity.ts` | Normalisasi identitas user dan pola username login |
| `lib/firebase-auth-rest.ts` | Operasi auth Firebase REST untuk sinkronisasi akun |
| `lib/current-teacher.ts` | Resolver guru aktif dari session user |
| `lib/ai-schedule.ts` | Default config dan helper Jadwal AI |
| `lib/class-picket.ts` | Helper identitas dan monitoring Piket Kelas |
| `lib/religious-picket.ts` | Helper identitas dan monitoring Piket Keagamaan |
| `lib/curriculum-submissions.ts` | Helper kategori submission perangkat |
| `prisma/schema.prisma` | Skema data PostgreSQL utama |
| `app/api/ai-schedule-config/route.ts` | Baca/simpan konfigurasi Jadwal AI |
| `app/api/class-picket-schedules/route.ts` | CRUD jadwal piket kelas |
| `app/api/class-picket-reports/route.ts` | Laporan realtime piket kelas |
| `app/api/religious-picket-schedules/route.ts` | CRUD jadwal piket keagamaan |
| `app/api/religious-picket-reports/route.ts` | Laporan realtime piket keagamaan |
| `app/api/curriculum-submissions/route.ts` | Submission dan verifikasi perangkat kurikulum |
| `app/api/journals/route.ts` | CRUD jurnal mengajar relasional |
| `app/api/users/route.ts` | CRUD akun berbasis Prisma |
| `app/api/dashboard/summary/route.ts` | Statistik dashboard server-side |
| `app/api/report-cards/preview/route.ts` | Builder preview raport berbasis nilai + TP + profil jurusan |
| `app/api/dkn/preview/route.ts` | Builder preview DKN berbasis nilai akhir semester |

---

## 6. Model Data

## 6.1 Model Inti

| Model | Keterangan |
|---|---|
| `User` | Akun aplikasi, role, email, nip |
| `Teacher` | Profil guru yang terhubung ke `User` |
| `Student` | Master data siswa |
| `ClassMajor` | Master data kelas-jurusan |
| `Subject` | Master data mata pelajaran |
| `Grade` | Semua jenis penilaian guru |
| `Journal` | Jurnal mengajar relasional |
| `TeachingObjective` | TP guru per mapel-kelas-periode |
| `AIScheduleConfig` | Konfigurasi Jadwal AI yang tersimpan di database |
| `ClassPicketSchedule` | Jadwal piket kelas dari admin |
| `ClassPicketReport` | Hasil pelaksanaan piket kelas dari guru |
| `ReligiousPicketSchedule` | Jadwal piket keagamaan dari admin |
| `ReligiousPicketReport` | Hasil pelaksanaan piket keagamaan dari guru |
| `CurriculumSubmission` | Submission perangkat pembelajaran / penilaian |
| `CurriculumActivity` | Riwayat aktivitas verifikasi perangkat |
| `Schedule` | Data jadwal umum |
| `CalendarEvent` | Kalender akademik |

## 6.2 Catatan Model Operasional Baru

### `AIScheduleConfig`

Menyimpan:

- `academicYear`
- `semester`
- `scheduleTeachersJson`
- `dayTimeSlotsJson`
- `religiousRestrictionsJson`
- `prioritiesJson`

Tujuan:

- konfigurasi `Jadwal Pelajaran AI` tidak lagi bergantung pada browser tertentu
- admin dapat membuka ulang halaman dan tetap melihat konfigurasi yang sama
- preview dan export mengikuti master `Kelas-Jurusan`

### `ClassPicketSchedule` dan `ClassPicketReport`

Tujuan:

- admin dan guru membaca jadwal piket kelas dari sumber data yang sama
- monitoring admin menghitung status `Belum / Proses / Selesai` dari data laporan riil
- detail laporan di ikon mata konsisten dengan format halaman guru

### `ReligiousPicketSchedule` dan `ReligiousPicketReport`

Tujuan:

- jadwal dan pelaksanaan piket keagamaan tidak lagi tersimpan di `localStorage`
- guru menyimpan status dan catatan ke server
- admin memantau hasil pelaksanaan yang sama secara realtime

### `CurriculumSubmission` dan `CurriculumActivity`

Tujuan:

- `Perangkat Pembelajaran` dan `Perangkat Penilaian` tidak lagi memakai `localStorage`
- monitoring admin membaca submission dan aktivitas verifikasi dari database
- histori submit dan verifikasi terdokumentasi per kategori

---

## 7. Modul yang Sudah Seragam Server-Side

Modul berikut sudah membaca sumber data server-side yang sama:

- Database Siswa
- Database Guru
- Database Kelas-Jurusan
- Database Mata Pelajaran
- Penilaian UH / Tugas / STS / SAS / Sikap
- Master Nilai
- Panel Guru untuk lihat nilai riil
- Jurnal Mengajar
- Kelola Akun
- Dashboard
- Tujuan Pembelajaran
- Cetak Raport TKJ / TKR
- Cetak DKN
- Jadwal Piket Kelas
- Monitoring Piket Kelas
- Jadwal Piket Keagamaan
- Monitoring Piket Keagamaan
- Jadwal Pelajaran AI untuk konfigurasi operasional
- Perangkat Pembelajaran
- Perangkat Penilaian

Catatan penting:

- Dropdown kelas dan jurusan pada modul yang relevan sudah diarahkan ke master `Kelas-Jurusan`
- Data dummy terbesar pada modul operasional sudah dibersihkan
- Perubahan jadwal dan laporan penting sekarang disimpan ke database agar sinkron antar akun dan perangkat

---

## 8. Modul yang Masih Perlu Migrasi Lanjutan

Modul yang masih perlu diseragamkan lebih lanjut ke API/database:

- `app/kurikulum/page.tsx`
- `app/buku-pembinaan/page.tsx`

Catatan:

- Halaman perangkat di bawah menu kurikulum sudah memakai API/database
- Yang masih tersisa terutama wrapper menu, alur non-inti, atau penguatan fitur pendukung
- Firebase masih dipakai khusus untuk login dan pertukaran token menjadi session server-side

---

## 9. Status Implementasi Sampai Saat Ini

### Sudah selesai

- Migrasi database utama ke PostgreSQL cloud
- Penyesuaian build Vercel dengan `prisma generate` dan `prisma db push`
- Session server-side berbasis cookie httpOnly
- Migrasi nilai agar menyimpan `teacherId` dan `userId` asli
- Validasi role guru dan relasi mapel/kelas pada API nilai
- Migrasi `jurnal-mengajar` ke `/api/journals`
- Migrasi `kelola-akun` ke `/api/users`
- Migrasi `dashboard` ke `/api/dashboard/summary`
- Login guru memakai username tanggal lahir format `ddmmyyyy` dan password default `guru123`
- Sinkronisasi akun guru lama ke pola login baru
- Data siswa memakai filter kelas yang sinkron dengan master `Kelas-Jurusan`
- Import data guru sudah mendukung parsing tanggal lahir `dd/mm/yyyy` termasuk serial angka Excel
- Jadwal Piket Kelas sudah memakai database dan laporan realtime
- Monitoring Piket Kelas admin sudah sinkron dengan data pelaksanaan guru
- Ikon mata pada Monitoring Piket Kelas sudah menampilkan detail read-only yang konsisten dengan halaman guru
- Jadwal Piket Keagamaan sudah berpindah ke API/database
- `Jadwal Pelajaran AI` sudah menyimpan konfigurasi ke database dan membaca kelas dinamis dari `Kelas-Jurusan`
- `Perangkat Pembelajaran` sudah memakai submission dan activity server-side
- `Perangkat Penilaian` sudah memakai submission dan activity server-side
- Opsi jurusan aplikasi dibatasi ke `TKJ` dan `TKR`
- Pengecekan database aktif memastikan tidak ada lagi data lama `RPL` / `DKV`
- Build production berhasil
- Deploy production berhasil ke alias utama

### Status production

- URL utama: `https://aplikasi-kurikulum-smk.vercel.app`
- Build terbaru lolos `prisma db push` dan `npm run vercel-build`
- Deploy terbaru sudah memuat migrasi `Jadwal AI`, `Piket Keagamaan`, `Perangkat Pembelajaran`, dan `Perangkat Penilaian`
- Production saat ini sudah lebih dekat ke prinsip `database sebagai sumber data tunggal`

---

## 10. Cara Menjalankan Lokal

## 10.1 Kebutuhan environment

Minimal environment yang dibutuhkan:

- `POSTGRES_PRISMA_URL`
- `DATABASE_URL`
- Firebase client env untuk login
- env Firebase REST yang dipakai sinkronisasi auth jika diperlukan

Catatan:

- Prisma CLI lokal membaca `.env`
- Next.js client juga membaca `.env.local`
- Untuk menghindari mismatch, nilai database sebaiknya konsisten di kedua file

## 10.2 Perintah lokal

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

## 11. Prinsip Arsitektur yang Harus Dijaga

- Semua data inti harus punya satu sumber kebenaran di server
- Role dan identitas tidak boleh dipercaya hanya dari payload frontend
- Dashboard, jurnal, nilai, akun, jadwal, dan monitoring harus membaca relasi Prisma yang sama
- Jika ada modul baru, utamakan `API -> Prisma -> PostgreSQL`
- Hindari `localStorage` untuk data transaksi lintas user
- Jika ada fitur monitoring admin, sumber datanya harus berasal dari input guru yang sama, bukan placeholder terpisah

---

Dokumen ini adalah referensi arsitektur aktif. Jika ada migrasi modul baru, perubahan auth, atau perubahan deploy, dokumen ini wajib diperbarui lagi agar sinkron dengan production.
