# Resume Progres — Sistem Login & Hak Akses (Role)

Terakhir diperbarui: 19 Juni 2026

Dokumen ini merangkum apa yang sudah dikerjakan dan apa yang akan dikerjakan
berikutnya, supaya mudah dilanjutkan di sesi mendatang.

---

## Tujuan

Membuat web dashboard ini bisa diakses dua jenis pengguna:
- **Admin sekolah** — akses semua menu.
- **Guru** — hanya akses menu tertentu yang ditentukan admin.

Menu yang boleh diakses **GURU** (sisanya khusus admin):
- Kurikulum → Perangkat Pembelajaran → **hanya tab "Submit Perangkat"**
- Jurnal → Jurnal Mengajar → **hanya tab "Format Jurnal Mengajar"**

## Keputusan yang sudah diambil

| Hal | Pilihan |
|---|---|
| Backend auth | **Firebase** (Authentication + Firestore) |
| Cara login | **NIP + password** (NIP dipetakan ke email internal `NIP@kurikulum-smk.local`) |
| Pembuatan akun guru | **Admin yang membuatkan** (guru tidak daftar sendiri) |
| Penyimpanan role/profil | Firestore koleksi `users`, doc id = UID |

Catatan arsitektur: aplikasi ini sebelumnya 100% client-side (data di
localStorage, belum pakai server/database). Firebase dipilih karena auth-nya
aman & siap pakai tanpa harus membangun server sendiri.

---

## SUDAH SELESAI ✅

### Kode (sudah tertulis di disk)
- `lib/firebase.ts` — inisialisasi Firebase (lazy/aman bila env kosong), helper
  `nipToEmail()`, dan `withSecondaryAuth()` (membuat akun guru tanpa membuat
  sesi admin ketendang).
- `lib/permissions.ts` — satu sumber kebenaran hak akses: `canAccessMenu()`,
  `canAccessTab()`, `defaultTabFor()`. **Di sinilah daftar menu/tab yang boleh
  diakses guru diatur** (`TEACHER_ALLOWED_MENU_IDS`, `TEACHER_ALLOWED_TABS`).
- `lib/auth-context.tsx` — `AuthProvider` + hook `useAuth()` (state user, role,
  login, logout, status `configured`).
- `app/login/page.tsx` — halaman login NIP + password, plus banner bila Firebase
  belum dikonfigurasi.
- `app/kelola-akun/page.tsx` — menu admin untuk membuat & menghapus akun guru.
- `app/page.tsx` — gate (wajib login), filter menu sesuai role, tampilkan
  nama/role asli + tombol logout, penjagaan "Akses Ditolak".
- `app/layout.tsx` — membungkus app dengan `AuthProvider`.
- `app/jurnal-mengajar/page.tsx` & `app/kurikulum-perangkat-pembelajaran/page.tsx`
  — tab dibatasi sesuai role.

### Perbaikan tambahan
- Membereskan **122 error TypeScript** bawaan di ~19 file lama (implicit-any dll)
  yang selama ini tersembunyi karena proyek belum pernah di-build.
- `npm run build` sekarang **lolos penuh** (24 halaman ter-prerender, tanpa error).

### Dokumen
- `SETUP_FIREBASE.md` — panduan setup Firebase langkah demi langkah.
- `.env.local.example` — template variabel lingkungan Firebase.

---

## BELUM DIKERJAKAN / LANGKAH SELANJUTNYA ⏳

### A. Setup Firebase (di tangan kamu — wajib agar login berfungsi)
Ikuti `SETUP_FIREBASE.md`:
1. Buat project Firebase, aktifkan **Email/Password** + **Firestore**.
2. Salin `.env.local.example` → `.env.local`, isi config, lalu restart server.
3. Buat **1 akun admin** manual via Firebase Console (Authentication + dokumen
   Firestore `users/<UID>` dengan field `role = ADMIN`).
4. Tempel **Firestore Security Rules** (ada di panduan) — ini penjaga keamanan
   sebenarnya, jangan dilewati.

### B. Git (opsional tapi disarankan)
- Perubahan **belum di-commit**. Disarankan commit ke branch baru agar progres
  aman & bisa di-rollback.

### C. Pengembangan lanjutan (ide, belum disepakati)
- Migrasi data aplikasi (siswa, guru, nilai, dll) dari **localStorage ke
  Firestore** supaya data tersimpan terpusat & sinkron antar perangkat. Ini
  pekerjaan besar & terpisah — sebaiknya bertahap per modul.
- Fitur "ganti password" untuk guru.
- Mencabut login guru sepenuhnya saat dihapus (saat ini menghapus profil/role di
  Firestore; hapus user di Authentication perlu Admin SDK atau manual di Console).
- Audit: pastikan setiap aksi tulis data (jurnal, nilai) juga divalidasi role-nya
  di Firestore Rules, bukan hanya disembunyikan di UI.

---

## Cara menjalankan & review

```bash
npm run dev      # mode pengembangan (untuk review)
npm run build    # build produksi (verifikasi, sudah lolos)
```

Sebelum Firebase dikonfigurasi: halaman login tampil dengan banner kuning
"Firebase belum dikonfigurasi" — itu normal.

## Tempat penting untuk mengubah hak akses

Kalau nanti mau menamb/mengurangi menu atau tab yang boleh diakses guru, cukup
ubah di **`lib/permissions.ts`** (`TEACHER_ALLOWED_MENU_IDS` dan
`TEACHER_ALLOWED_TABS`). ID-nya harus cocok dengan id menu di `app/page.tsx`.
