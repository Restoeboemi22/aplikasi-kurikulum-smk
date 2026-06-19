# Resume Progres — Sistem Login, Hak Akses & Deploy

Terakhir diperbarui: 19 Juni 2026

Dokumen ini merangkum apa yang sudah dikerjakan dan apa yang akan dikerjakan
berikutnya, supaya mudah dilanjutkan di sesi mendatang.

> Catatan untuk sesi mendatang: AI tidak mengingat percakapan sebelumnya.
> Untuk melanjutkan, buka proyek lalu minta AI membaca file ini + file
> `Lanjut/ARSITEKTUR_SISTEM_MASTER_APLIKASI.md`.

---

## Tujuan

Membuat web dashboard ini bisa diakses dua jenis pengguna:
- **Admin sekolah** — akses semua menu.
- **Guru** — hanya akses menu tertentu yang ditentukan admin.

## Status singkat

🟢 **Aplikasi sudah LIVE online:** https://aplikasi-kurikulum-smk.vercel.app
🟢 Login admin & guru sudah terbukti jalan.
🟢 Data Guru sudah online realtime (Firestore).

---

## Keputusan yang sudah diambil

| Hal | Pilihan |
|---|---|
| Backend auth | **Firebase** (Authentication + Firestore) |
| Cara login | **NIP + password** (NIP dipetakan ke email internal `NIP@kurikulum-smks-pacet.local`) |
| Pembuatan akun guru | **Admin yang membuatkan** lewat menu "Kelola Akun" (guru tidak daftar sendiri) |
| Penyimpanan role/profil | Firestore koleksi `users`, doc id = UID |
| Hosting | **Vercel** (terhubung ke GitHub, auto-deploy tiap push) |
| Repo GitHub | **Public** — https://github.com/Restoeboemi22/aplikasi-kurikulum-smk |

---

## Menu yang bisa diakses GURU (per saat ini)

Diatur di `lib/permissions.ts` (`TEACHER_ALLOWED_MENU_IDS`):
1. **Kurikulum → Perangkat Pembelajaran** → hanya tab **"Submit Perangkat"**
2. **Kurikulum → Perangkat Penilaian** → seluruh halaman (halaman ini tidak bertab)
3. **Jurnal → Jurnal Mengajar** → hanya tab **"Format Jurnal Mengajar"**

Sisanya (Dashboard, Database, Jadwal, Penilaian, Kelola Akun, Pengaturan) khusus admin.

> Catatan: halaman "Perangkat Penilaian" sebenarnya tampilan MONITORING admin
> (daftar semua guru + status verifikasi). Guru melihat tampilan yang sama.
> Kalau mau guru hanya submit/lihat miliknya sendiri, perlu dibuatkan tab khusus.

---

## SUDAH SELESAI ✅

### Autentikasi & hak akses
- `lib/firebase.ts` — init Firebase (lazy/aman), `nipToEmail()`,
  `withSecondaryAuth()` (buat akun guru tanpa sesi admin ketendang).
  Domain NIP: `kurikulum-smks-pacet.local`.
- `lib/permissions.ts` — sumber kebenaran hak akses (menu & tab guru).
- `lib/auth-context.tsx` — `AuthProvider` + `useAuth()`.
- `app/login/page.tsx` — halaman login NIP + password.
- `app/kelola-akun/page.tsx` — admin buat/hapus akun guru.
- `app/page.tsx` — gate login, filter menu per role, user asli + logout,
  penjaga "Akses Ditolak".
- `app/jurnal-mengajar/page.tsx` & `app/kurikulum-perangkat-pembelajaran/page.tsx`
  — tab dibatasi sesuai role.

### Setup Firebase (SUDAH dilakukan)
- Project Firebase `kurikulum-smks-pacet` aktif.
- Email/Password + Firestore aktif.
- Akun admin pertama dibuat: NIP `03041984` (Anik Yunani, S.Pd), role ADMIN.
- Firestore Security Rules sudah dipasang (untuk `users` & `teachers_data`).
- `.env.local` terisi (tidak ikut git — aman).

### Deploy (SUDAH dilakukan)
- Repo di GitHub (public), terhubung ke Vercel, auto-deploy tiap push ke `main`.
- 6 env Firebase di-set di Vercel (Production).
- Domain Vercel sudah didaftarkan di Firebase → Authorized domains.
- Identitas commit lokal di-set ke `Restoeboemi22` (agar Vercel Hobby tidak
  memblokir deploy).

### Data online (migrasi Firestore)
- **Data Guru** (menu Database → Data Guru) sudah pindah dari localStorage ke
  Firestore koleksi `teachers_data`, dengan **realtime sync** (`onSnapshot`).
  Tambah/edit/hapus langsung tersinkron di semua perangkat.

### Lain-lain
- `app/sw-cleanup.tsx` — pembersih service worker & cache nyasar otomatis
  (mencegah masalah "muter-muter" / versi lama tidak ter-update).
- Membereskan 122 error TypeScript bawaan → `npm run build` lolos penuh.
- Dokumen: `SETUP_FIREBASE.md`, `.env.local.example`.

---

## BELUM DIKERJAKAN / LANGKAH SELANJUTNYA ⏳

### Data yang MASIH di localStorage (belum online)
Semua modul ini masih simpan data di browser (belum terpusat/realtime):
- Data Siswa, Mata Pelajaran, Kelas-Jurusan
- Jadwal (piket, pelajaran), Jurnal, Buku Pembinaan
- Penilaian (UH, Tugas, STS, SAS, Sikap, Raport)

Pola migrasi sudah terbukti di **Data Guru** — modul lain bisa mengikuti pola
sama: koleksi Firestore + `onSnapshot` + addDoc/updateDoc/deleteDoc, dan
tambahkan aturannya di Firestore Rules.

### Fitur yang diminta tapi belum dibuat
- **Ganti password mandiri untuk guru** (sekarang harus lewat admin/Console).
- Perangkat Penilaian versi "khusus guru" (submit/lihat miliknya sendiri),
  kalau tidak mau guru melihat data semua guru.

### Catatan teknis
- Hapus akun di "Kelola Akun" hanya menghapus profil/role (Firestore). Untuk
  mencabut login total, hapus juga user di Authentication (Console/Admin SDK).
- Token Vercel yang dipakai saat deploy sudah tidak valid/dicabut — kalau perlu
  deploy manual via CLI lagi, buat token baru. (Tidak wajib: auto-deploy jalan
  tiap push ke GitHub.)

---

## Cara kerja sehari-hari

**Menambah akun guru (admin):**
1. Login admin → menu **Kelola Akun**.
2. Isi NIP, Nama, Password awal, pilih hak akses **Guru** → **Buat Akun**.
3. Beri tahu guru NIP + password-nya.

**Update aplikasi (developer):**
- Ubah kode → commit → `git push origin main` → Vercel auto-deploy.

**Mengubah hak akses menu/tab guru:**
- Edit `lib/permissions.ts` (`TEACHER_ALLOWED_MENU_IDS`, `TEACHER_ALLOWED_TABS`).
  ID harus cocok dengan id menu di `app/page.tsx`.

---

## Cara menjalankan lokal

```bash
npm install
npm run dev      # pengembangan (localhost)
npm run build    # build produksi (verifikasi)
```

## Identitas penting

- URL aplikasi: https://aplikasi-kurikulum-smk.vercel.app
- Repo: https://github.com/Restoeboemi22/aplikasi-kurikulum-smk
- Project Firebase: `kurikulum-smks-pacet`
- Admin: NIP `03041984` (Anik Yunani, S.Pd)
