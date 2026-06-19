# ARSITEKTUR SISTEM MASTER — APLIKASI KURIKULUM SMK

> **Versi:** 2.0.0
> **Platform:** Next.js (React + TypeScript) + Firebase
> **Tanggal diperbarui:** 19 Juni 2026

---

## ⚠️ CATATAN PENTING — PERUBAHAN ARSITEKTUR

Dokumen ini menggantikan `ARSITEKTUR_SISTEM_MASTER_APLIKASI.md` versi 1.0.0 yang
mendeskripsikan rencana berbasis **Google AppSheet**. Implementasi nyata aplikasi
**tidak memakai AppSheet**, melainkan aplikasi web **Next.js** dengan **Firebase**.

| Aspek | Rencana lama (v1.0) | Implementasi nyata (v2.0) |
|---|---|---|
| Platform aplikasi | Google AppSheet (no-code) | Next.js 15 (React 19 + TypeScript) |
| Autentikasi & role | AppSheet Security Filter | Firebase Authentication + Firestore |
| Database | Google Sheets | Firestore (role/profil) + localStorage (data modul, sementara) |
| UI | AppSheet Views | Komponen React + Tailwind CSS |
| Login | `USEREMAIL()` AppSheet | NIP + password (dipetakan ke email internal Firebase) |

Bagian konsep (role, modul, alur kerja) sebagian besar masih relevan; yang berubah
adalah **teknologi pelaksananya**.

---

## 1. GAMBARAN UMUM

Aplikasi Kurikulum SMK adalah web dashboard untuk mengelola kurikulum, jadwal,
jurnal mengajar, dan penilaian di jenjang SMK. Aplikasi dibangun dengan Next.js
dan memakai Firebase untuk login serta pembedaan hak akses pengguna.

### 1.1 Tujuan
- Memusatkan pengelolaan dokumen & aktivitas kurikulum dalam satu aplikasi.
- Memudahkan monitoring pembelajaran oleh admin (Wakasek Kurikulum).
- Memberi guru akses terbatas hanya ke menu yang relevan.

### 1.2 Prinsip Desain
| Prinsip | Penjelasan |
|---|---|
| **Role-Based Access** | Admin akses penuh; guru hanya menu yang ditentukan |
| **Keamanan di sisi server** | Penjaga sebenarnya = Firestore Security Rules, bukan sekadar sembunyikan menu |
| **Least privilege** | Default role = TEACHER bila tidak diset |
| **Komponen modular** | Tiap modul = halaman/komponen React terpisah |

---

## 2. ARSITEKTUR TEKNIS (LAPISAN)

```
┌──────────────────────────────────────────────────────────────┐
│                 LAPISAN 1: PENGGUNA                            │
│        Admin (Wakasek Kurikulum)  │  Guru                      │
└──────────────────────────┬───────────────────────────────────┘
                           │ Browser (akses web)
┌──────────────────────────▼───────────────────────────────────┐
│            LAPISAN 2: APLIKASI WEB (Next.js)                   │
│  AuthProvider │ Gate login │ Filter menu/tab │ Halaman modul   │
│  (React + TypeScript + Tailwind CSS)                           │
└──────────────────────────┬───────────────────────────────────┘
                           │ Firebase SDK
┌──────────────────────────▼───────────────────────────────────┐
│              LAPISAN 3: FIREBASE                               │
│  Authentication (login)  │  Firestore (role & profil user)    │
│  + Security Rules (penjaga akses sebenarnya)                   │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│        LAPISAN 4: DATA MODUL (sementara: localStorage)        │
│  Siswa │ Guru │ Kelas │ Mapel │ Jadwal │ Jurnal │ Nilai        │
│  (rencana migrasi ke Firestore — lihat bagian Roadmap)         │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. AUTENTIKASI & HAK AKSES (BARU)

### 3.1 Role Pengguna
| Role | Akses |
|---|---|
| **ADMIN** (Wakasek Kurikulum) | Semua menu + menu "Kelola Akun" |
| **TEACHER** (Guru) | Hanya menu yang ditentukan (lihat 3.3) |

> Enum role lain (`PRINCIPAL`, `STUDENT`) ada di skema Prisma lama namun belum
> dipakai pada implementasi auth saat ini.

### 3.2 Cara Login
- Guru/admin login dengan **NIP + password**.
- NIP dipetakan otomatis ke email internal `NIP@kurikulum-smk.local` (helper
  `nipToEmail()`), karena Firebase Auth berbasis email. Email ini tidak pernah
  dilihat pengguna.
- Akun guru dibuat oleh **admin** lewat menu "Kelola Akun" (guru tidak mendaftar
  sendiri). Pembuatan akun memakai instance Firebase kedua (`withSecondaryAuth()`)
  agar sesi admin tidak ketendang.

### 3.3 Matriks Hak Akses Menu (implementasi saat ini)
| Menu | Admin | Guru |
|---|---|---|
| Dashboard | ✅ | ❌ |
| Database (Siswa, Guru, Kelas, Mapel) | ✅ | ❌ |
| Kurikulum → Perangkat Pembelajaran | ✅ (semua tab) | ✅ **hanya tab "Submit Perangkat"** |
| Kurikulum → Perangkat Penilaian | ✅ | ❌ |
| Jadwal (Piket, Pelajaran AI) | ✅ | ❌ |
| Jurnal → Jurnal Mengajar | ✅ (semua tab) | ✅ **hanya tab "Format Jurnal Mengajar"** |
| Jurnal → Buku Pembinaan | ✅ | ❌ |
| Penilaian (UH, Tugas, STS, SAS, Sikap, Raport) | ✅ | ❌ |
| Kelola Akun | ✅ | ❌ |
| Pengaturan | ✅ | ❌ |

> Aturan ini diatur terpusat di `lib/permissions.ts`
> (`TEACHER_ALLOWED_MENU_IDS`, `TEACHER_ALLOWED_TABS`). Untuk menambah/mengurangi
> akses guru, cukup ubah file itu.

### 3.4 Lapisan Keamanan
1. **UI (Next.js)** — sembunyikan menu/tab yang tidak boleh. Sifatnya kosmetik.
2. **Penjaga konten** — `renderGuardedContent()` menolak halaman terlarang meski
   diakses lewat state.
3. **Firestore Security Rules** — penjaga **sebenarnya**: hanya ADMIN yang boleh
   menulis/mengubah role; guru hanya bisa membaca profilnya sendiri. (Lihat
   `SETUP_FIREBASE.md`.)

---

## 4. STRUKTUR KODE

```
Aplikasi Kurikulum/
├── app/
│   ├── layout.tsx                  # Membungkus app dengan AuthProvider
│   ├── page.tsx                    # Shell: gate login, sidebar, filter menu per role
│   ├── login/page.tsx              # Halaman login NIP + password
│   ├── kelola-akun/page.tsx        # [ADMIN] buat & hapus akun guru
│   ├── dashboard/page.tsx
│   ├── kurikulum-perangkat-pembelajaran/page.tsx  # tab dibatasi role
│   ├── jurnal-mengajar/page.tsx                    # tab dibatasi role
│   └── ... (modul lain: siswa, guru, penilaian, jadwal, dsb.)
├── lib/
│   ├── firebase.ts                 # Init Firebase + helper (nipToEmail, withSecondaryAuth)
│   ├── auth-context.tsx            # AuthProvider + hook useAuth()
│   ├── permissions.ts              # Sumber kebenaran hak akses role
│   └── prisma.ts                   # (peninggalan; belum dipakai aktif)
├── prisma/schema.prisma            # Skema lama (referensi model data)
├── SETUP_FIREBASE.md               # Panduan setup Firebase
├── .env.local.example              # Template env Firebase
└── Lanjut/
    ├── RESUME_PROGRES.md           # Ringkasan progres & langkah berikut
    └── ARSITEKTUR_SISTEM_MASTER_APLIKASI.md  # (dokumen ini)
```

### Berkas kunci
| Berkas | Peran |
|---|---|
| `lib/firebase.ts` | Inisialisasi Firebase (lazy, aman bila env kosong) |
| `lib/auth-context.tsx` | State user/role, fungsi login/logout |
| `lib/permissions.ts` | Definisi menu/tab yang boleh diakses tiap role |
| `app/page.tsx` | Gate, sidebar, filter menu, penjaga konten |
| `app/kelola-akun/page.tsx` | Manajemen akun oleh admin |

---

## 5. MODEL DATA

### 5.1 Firestore (aktif untuk auth)
**Koleksi `users`** — doc id = UID Firebase Auth:
```
users/{uid}
├── nip:   string   (NIP, tanpa domain)
├── name:  string   (nama lengkap)
└── role:  string   ("ADMIN" | "TEACHER")
```

### 5.2 Data Modul (saat ini di localStorage — sementara)
Data siswa, guru, kelas, mapel, jadwal, jurnal, nilai masih disimpan di
`localStorage` browser. Skema referensi (model lama) ada di `prisma/schema.prisma`
(`User`, `Teacher`, `Curriculum`, `Schedule`, `Journal`, `Student`, `Grade`,
`CalendarEvent`). Rencana: migrasi ke Firestore (lihat Roadmap).

---

## 6. STACK TEKNOLOGI

| Komponen | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router) |
| Bahasa | TypeScript (strict mode) |
| UI | React 19, Tailwind CSS, lucide-react (ikon) |
| Auth | Firebase Authentication (Email/Password) |
| Database (auth) | Cloud Firestore |
| Animasi | framer-motion |
| Excel/Export | exceljs, xlsx, file-saver |

---

## 7. STATUS & ROADMAP

### Sudah selesai ✅
- Sistem login NIP + password (Firebase Auth).
- Gate: semua halaman wajib login.
- Filter menu & tab berbasis role.
- Menu admin "Kelola Akun" (buat/hapus akun guru).
- Sidebar menampilkan user & role asli + logout.
- `npm run build` lolos penuh (perbaikan 122 error type bawaan).
- Dokumen: `SETUP_FIREBASE.md`, `.env.local.example`.

### Wajib dilakukan pengguna ⏳
- Setup project Firebase + isi `.env.local` (ikuti `SETUP_FIREBASE.md`).
- Buat akun admin pertama secara manual.
- Pasang Firestore Security Rules (penjaga keamanan sebenarnya).

### Pengembangan lanjutan (rencana) 🔭
- Migrasi data modul dari localStorage ke **Firestore** (bertahap per modul).
- Fitur ganti password untuk guru.
- Pencabutan login guru sepenuhnya (perlu Admin SDK / manual di Console).
- Validasi role di Firestore Rules untuk setiap operasi tulis data modul.

---

## 8. CARA MENJALANKAN

```bash
npm install        # pasang dependensi (sekali)
npm run dev        # mode pengembangan (review di localhost)
npm run build      # build produksi (verifikasi)
npm run start      # jalankan hasil build
```

Sebelum Firebase dikonfigurasi, halaman login menampilkan banner
"Firebase belum dikonfigurasi" — itu wajar.

---

*Dokumen ini adalah referensi teknis yang mencerminkan implementasi nyata
(Next.js + Firebase). Perbarui setiap ada perubahan arsitektur.*
