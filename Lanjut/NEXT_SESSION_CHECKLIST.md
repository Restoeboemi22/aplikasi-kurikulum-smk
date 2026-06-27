# Next Session Checklist

Terakhir diperbarui: 25 Juni 2026

Dokumen ini adalah checkpoint singkat untuk memulai sesi berikutnya tanpa harus membaca seluruh histori chat terlebih dahulu.

---

## 1. Kondisi Saat Ini

- Production aktif di `https://aplikasi-kurikulum-smk.vercel.app`
- Build terakhir lolos `npx prisma db push` dan `npm run vercel-build`
- Deploy production terbaru sudah berhasil
- Arsitektur aktif sudah berada di jalur `Next.js -> API Routes -> Prisma -> PostgreSQL`
- Session server-side sudah aktif untuk otorisasi API
- Login guru aktif memakai:
  - username: tanggal lahir format `ddmmyyyy`
  - password default: `guru123`

---

## 2. Yang Sudah Beres

- `Jurnal Mengajar` sudah server-side
- `Kelola Akun` sudah server-side
- `Dashboard` sudah server-side
- `Jadwal Piket Kelas` sudah server-side
- `Monitoring Piket Kelas` sudah sinkron dengan laporan guru
- `Jadwal Piket Keagamaan` sudah server-side
- `Monitoring Piket Keagamaan` sudah sinkron dengan laporan guru
- `Jadwal Pelajaran AI` sudah menyimpan konfigurasi ke database
- `Perangkat Pembelajaran` sudah memakai submission/activity database
- `Perangkat Penilaian` sudah memakai submission/activity database
- `Cetak Raport TKJ/TKR`, `TP`, dan `Cetak DKN` sudah aktif
- Audit storage campuran sudah diperbarui
- Dokumentasi `ARSITEKTUR`, `RESUME`, dan `AUDIT` sudah sinkron

---

## 3. Prioritas Berikutnya

1. Migrasi `app/kurikulum/page.tsx` ke API + PostgreSQL
2. Migrasi `app/buku-pembinaan/page.tsx`
3. Rapikan strategi auth jangka panjang untuk provisioning akun Firebase
4. Tambah smoke test manual admin/guru berbasis data production

---

## 4. File Acuan Utama

- `Lanjut/ARSITEKTUR_SISTEM_MASTER_APLIKASI.md`
- `Lanjut/RESUME_PROGRES.md`
- `Lanjut/AUDIT_STORAGE_MIXED.md`
- `prisma/schema.prisma`
- `lib/server-session.ts`
- `lib/user-identity.ts`
- `lib/firebase-auth-rest.ts`

---

## 5. Modul Server-Side Penting

- `/api/auth/session`
- `/api/auth/me`
- `/api/students`
- `/api/teachers`
- `/api/class-majors`
- `/api/subjects`
- `/api/grades`
- `/api/journals`
- `/api/users`
- `/api/dashboard/summary`
- `/api/class-picket-schedules`
- `/api/class-picket-reports`
- `/api/religious-picket-schedules`
- `/api/religious-picket-reports`
- `/api/ai-schedule-config`
- `/api/curriculum-submissions`
- `/api/report-cards/*`
- `/api/dkn/*`

---

## 6. Checklist Mulai Sesi

1. Baca `Lanjut/RESUME_PROGRES.md`
2. Baca `Lanjut/ARSITEKTUR_SISTEM_MASTER_APLIKASI.md`
3. Baca `Lanjut/AUDIT_STORAGE_MIXED.md`
4. Tentukan apakah task berikutnya masuk ke:
   - migrasi modul
   - perbaikan bug production
   - uji manual
   - deploy
5. Jika ada edit besar, jalankan:
   - `npx prisma db push`
   - `npm run vercel-build`

---

## 7. Catatan Penting

- Jangan kembalikan modul yang sudah server-side ke `localStorage`
- Untuk fitur monitoring admin, sumber data harus sama dengan input guru
- ID guru di database bertipe `string`, jangan pakai `parseInt`
- Jurusan aktif yang dipakai aplikasi saat ini adalah `TKJ` dan `TKR`
- Jika menyentuh auth guru, pertahankan rule login `ddmmyyyy` + `guru123` kecuali ada arahan baru

---

## 8. Ringkasan Satu Baris

Sesi berikutnya paling masuk akal dimulai dari migrasi `kurikulum` umum atau `buku-pembinaan`, karena modul inti storage campuran sudah dibereskan dan production terbaru sudah stabil.
