# ARSITEKTUR SISTEM MASTER APLIKASI KURIKULUM SMK
## Terintegrasi Google Workspace (AppSheet)

> **Versi:** 1.0.0  
> **Dibuat oleh:** Wakasek Kurikulum  
> **Platform:** Google AppSheet + Google Workspace  
> **Tanggal:** Juni 2026

---

## 1. GAMBARAN UMUM SISTEM

Aplikasi Kurikulum SMK adalah sistem manajemen kurikulum berbasis cloud yang dibangun di atas platform **Google AppSheet** dan terintegrasi penuh dengan **Google Workspace**. Sistem ini dirancang untuk mendukung pengelolaan kurikulum Merdeka Belajar di jenjang SMK secara terpadu, efisien, dan real-time.

### 1.1 Tujuan Sistem

- Memusatkan pengelolaan seluruh dokumen kurikulum dalam satu platform
- Memudahkan monitoring pelaksanaan pembelajaran oleh guru
- Menyederhanakan proses penilaian dan pelaporan akademik
- Mengintegrasikan seluruh alur kerja kurikulum dengan Google Workspace

### 1.2 Prinsip Desain

| Prinsip | Penjelasan |
|---|---|
| **Single Source of Truth** | Semua data bersumber dari Google Sheets terpusat |
| **No-Code First** | Dibangun tanpa koding menggunakan AppSheet |
| **Role-Based Access** | Hak akses berbeda tiap level pengguna |
| **Mobile-First** | Dapat diakses via smartphone oleh guru di mana saja |
| **Auto-Sync** | Perubahan data langsung tersinkronisasi antar modul |

---

## 2. ARSITEKTUR SISTEM (5 LAPISAN)

```
┌─────────────────────────────────────────────────────────────┐
│                   LAPISAN 1: PENGGUNA                       │
│  Wakasek Kurikulum │ Guru │ Kepala Sekolah │ Siswa (terbatas)│
└──────────────────────────┬──────────────────────────────────┘
                           │ Akses via Web / Mobile App
┌──────────────────────────▼──────────────────────────────────┐
│               LAPISAN 2: APLIKASI (AppSheet)                │
│   Role & Akses │ Views & UI │ Automation Bot │ Report Engine│
└──────────────────────────┬──────────────────────────────────┘
                           │ Google Workspace API
┌──────────────────────────▼──────────────────────────────────┐
│          LAPISAN 3: INTEGRASI GOOGLE WORKSPACE              │
│  Google Sheets │ Google Drive │ Google Forms │ Google Cal   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Baca / Tulis Data
┌──────────────────────────▼──────────────────────────────────┐
│              LAPISAN 4: DATA (Tabel Master)                 │
│  T_Kurikulum │ T_Guru │ T_Jadwal │ T_Jurnal │ T_Nilai       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Generate Output
┌──────────────────────────▼──────────────────────────────────┐
│                LAPISAN 5: OUTPUT & PELAPORAN                │
│  Laporan PDF │ Export Sheets │ Email Otomatis │ Dashboard   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. LAPISAN 1 — PENGGUNA & HAK AKSES

### 3.1 Role Pengguna

| Role | Level Akses | Deskripsi |
|---|---|---|
| **Wakasek Kurikulum** | Admin Penuh | Kelola semua modul, approve dokumen, generate laporan |
| **Guru / Pengajar** | Edit Terbatas | Input jurnal, upload RPP, lihat jadwal sendiri |
| **Kepala Sekolah** | View + Approve | Pantau dashboard, approve laporan akhir |
| **Siswa** | Read Only | Lihat nilai & rapor pribadi (opsional) |

### 3.2 Matriks Hak Akses

| Modul | Wakasek | Guru | Kepsek | Siswa |
|---|---|---|---|---|
| Dokumen Kurikulum | CRUD | Read + Upload RPP | Read | — |
| Jadwal Pelajaran | CRUD | Read | Read | Read |
| Jurnal Mengajar | Read + Approve | Create + Edit | Read | — |
| Penilaian & Nilai | CRUD | Input Nilai | Read | Read (milik sendiri) |
| Laporan & Analitik | Full | — | Read | — |
| Pengaturan Sistem | Full | — | — | — |

> **CRUD** = Create, Read, Update, Delete

---

## 4. LAPISAN 2 — APLIKASI APPSHEET

### 4.1 Komponen Utama AppSheet

#### A. Role & Security Filter
```
Konfigurasi di AppSheet:
- Security > Require Sign-In: ON
- Gunakan USEREMAIL() untuk filter data per pengguna
- Contoh formula filter guru:
  [Email Guru] = USEREMAIL()
```

#### B. Views & UI Utama

| View | Tipe | Modul |
|---|---|---|
| Dashboard Utama | Dashboard | Semua modul |
| Daftar Dokumen | Table + Gallery | Dokumen Kurikulum |
| Kalender Akademik | Calendar | Jadwal & Akademik |
| Jurnal Guru | Form + Table | Monitoring Guru |
| Input Nilai | Form + Spreadsheet | Penilaian |
| Laporan Progres | Chart + Table | Analitik |

#### C. Automation Bot

| Bot | Trigger | Aksi |
|---|---|---|
| Notif RPP Belum Upload | Jadwal H-3 | Kirim email ke guru terkait |
| Notif Jurnal Kosong | Setiap hari pukul 15.00 | Email pengingat ke guru |
| Laporan Mingguan | Setiap Jumat | Generate & kirim ke Kepsek |
| Approve Dokumen | Wakasek klik Approve | Notif ke guru via email |

#### D. Report Engine
- Format output: PDF via AppSheet Reports
- Template rapor menggunakan Google Docs template
- Export data ke Google Sheets untuk analisis lanjutan

---

## 5. LAPISAN 3 — INTEGRASI GOOGLE WORKSPACE

### 5.1 Google Sheets — Database Utama

**Fungsi:** Menyimpan seluruh data terstruktur aplikasi  
**Lokasi:** Google Drive > Folder `[NAMA SEKOLAH] - Data Kurikulum`

| Workbook | Isi |
|---|---|
| `MASTER_KURIKULUM.xlsx` | CP, TP, ATP, Silabus per mapel |
| `MASTER_GURU.xlsx` | Data guru, mapel, beban mengajar |
| `MASTER_JADWAL.xlsx` | Jadwal pelajaran semua kelas |
| `JURNAL_MENGAJAR.xlsx` | Rekap jurnal harian dari Google Forms |
| `PENILAIAN_SISWA.xlsx` | Nilai harian, UH, UTS, UAS, rapor |
| `KALENDER_AKADEMIK.xlsx` | Hari efektif, libur, kegiatan sekolah |

### 5.2 Google Drive — Repositori Dokumen

**Struktur folder:**
```
📁 Kurikulum SMK [Nama Sekolah]
├── 📁 01_Dokumen_Kurikulum
│   ├── 📁 CP_TP_ATP
│   ├── 📁 Silabus
│   └── 📁 Modul_Ajar
├── 📁 02_Perangkat_Guru
│   ├── 📁 RPP_[Tahun Ajaran]
│   │   ├── 📁 [Nama Guru]
│   └── 📁 Bahan_Ajar
├── 📁 03_Penilaian
│   ├── 📁 Bank_Soal
│   └── 📁 Rapor_Digital
├── 📁 04_Laporan
│   ├── 📁 Laporan_Mingguan
│   └── 📁 Laporan_Semester
└── 📁 05_Arsip
```

### 5.3 Google Forms — Input Data Guru

| Form | Pengisi | Frekuensi | Terhubung ke |
|---|---|---|---|
| Jurnal Mengajar Harian | Guru | Setiap KBM | JURNAL_MENGAJAR.xlsx |
| Form Observasi Kelas | Wakasek | Per observasi | MONITORING_GURU.xlsx |
| Input Nilai Harian | Guru | Per KD selesai | PENILAIAN_SISWA.xlsx |
| Laporan Penggantian Jam | Guru | Jika ada | JADWAL.xlsx |

### 5.4 Google Calendar — Kalender Akademik

**Kalender yang dibuat:**
- `[Sekolah] Kalender Akademik` — Dibagikan ke semua guru (view)
- `[Sekolah] Jadwal Ujian` — Dibagikan ke guru & siswa
- `[Sekolah] Kegiatan Sekolah` — Dibagikan publik sekolah

---

## 6. LAPISAN 4 — STRUKTUR TABEL MASTER

### T_KURIKULUM
```
Kolom:
- ID_Kurikulum (Key)
- Kompetensi_Keahlian
- Mata_Pelajaran
- Kelas
- Semester
- CP (Capaian Pembelajaran)
- TP (Tujuan Pembelajaran)
- ATP (Alur Tujuan Pembelajaran)
- Alokasi_Waktu
- Tahun_Ajaran
- Status [Aktif/Arsip]
- Link_Dokumen (URL Google Drive)
```

### T_GURU
```
Kolom:
- ID_Guru (Key)
- Nama_Lengkap
- NIP
- Email (digunakan sebagai login AppSheet)
- Mata_Pelajaran
- Kelas_Ajar (multi-value)
- Beban_Mengajar (jam/minggu)
- Status_Perangkat_Ajar [Lengkap/Belum Lengkap]
- Foto_Profil (URL Drive)
```

### T_JADWAL
```
Kolom:
- ID_Jadwal (Key)
- Hari
- Jam_Ke
- Waktu_Mulai
- Waktu_Selesai
- Kelas
- Mata_Pelajaran
- ID_Guru (Ref → T_GURU)
- Ruang
- Tahun_Ajaran
- Semester
```

### T_JURNAL
```
Kolom:
- ID_Jurnal (Key)
- Tanggal
- ID_Guru (Ref → T_GURU)
- Kelas
- Mata_Pelajaran
- Materi_Ajar
- TP_yang_Dicapai (Ref → T_KURIKULUM)
- Metode_Pembelajaran
- Jumlah_Hadir
- Kendala
- Catatan
- Status_Verifikasi [Belum/Sudah]
- Timestamp (otomatis)
```

### T_NILAI
```
Kolom:
- ID_Nilai (Key)
- ID_Siswa
- Nama_Siswa
- Kelas
- Mata_Pelajaran
- Semester
- Nilai_Harian (rata-rata)
- Nilai_UTS
- Nilai_UAS
- Nilai_Praktik
- Nilai_Akhir (formula otomatis)
- Predikat [A/B/C/D]
- Ketuntasan [Tuntas/Belum Tuntas]
- Catatan_Guru
```

### T_KALENDER
```
Kolom:
- ID_Kalender (Key)
- Tanggal
- Keterangan
- Jenis [Hari Efektif/Libur Nasional/Libur Sekolah/Kegiatan/Ujian]
- Berlaku_Untuk [Semua/Kelas Tertentu]
- Semester
```

---

## 7. LAPISAN 5 — OUTPUT & PELAPORAN

### 7.1 Jenis Output

| Output | Format | Penerima | Frekuensi |
|---|---|---|---|
| Laporan progres kurikulum | PDF | Kepsek | Bulanan |
| Rekap jurnal mengajar | PDF + Sheets | Wakasek | Mingguan |
| Rapor siswa | PDF (template Google Docs) | Orang tua/Siswa | Per semester |
| Analisis ketuntasan belajar | Dashboard AppSheet | Wakasek | Real-time |
| Laporan kelengkapan perangkat | PDF | Kepsek | Per semester |
| Rekap kehadiran siswa | Sheets | Wakasek | Bulanan |

### 7.2 Formula Nilai Akhir (Google Sheets)

```
Nilai Akhir = (Nilai_Harian × 40%) + (Nilai_UTS × 25%) + (Nilai_UAS × 35%)

Predikat:
- A  : ≥ 90
- B  : 75 – 89
- C  : 60 – 74
- D  : < 60
```

---

## 8. ALUR KERJA UTAMA (WORKFLOW)

### 8.1 Alur Pengelolaan Dokumen Kurikulum
```
Wakasek input CP/TP/ATP
        ↓
Unggah ke Google Drive (folder terstruktur)
        ↓
Guru menerima notifikasi dokumen baru
        ↓
Guru buat RPP & upload ke Drive
        ↓
Wakasek review RPP di AppSheet
        ↓
Approve → Arsip | Revisi → Notif ke guru
```

### 8.2 Alur Monitoring Pembelajaran Harian
```
Guru mengajar (KBM)
        ↓
Guru isi Google Form "Jurnal Harian"
        ↓
Data otomatis masuk ke JURNAL_MENGAJAR.xlsx
        ↓
AppSheet update dashboard monitoring
        ↓
Wakasek pantau progres real-time
        ↓
Laporan mingguan otomatis dikirim ke Kepsek
```

### 8.3 Alur Penilaian & Rapor
```
Guru input nilai harian via AppSheet / Google Forms
        ↓
Sistem hitung nilai otomatis (formula Sheets)
        ↓
Wakasek verifikasi & validasi nilai
        ↓
Generate rapor via template Google Docs
        ↓
PDF rapor disimpan di Google Drive
        ↓
Distribusi ke orang tua / siswa
```

---

## 9. SPESIFIKASI TEKNIS

### 9.1 Kebutuhan Akun Google

| Kebutuhan | Keterangan |
|---|---|
| Akun Google Workspace (diutamakan) | Akun sekolah @sekolah.sch.id |
| Minimal akun Gmail biasa | Untuk testing awal |
| AppSheet Plan | Free (hingga 10 user) / Core ($5/user/bulan) |
| Google Drive Storage | Min. 15 GB (upgrade jika perlu) |

### 9.2 Kebutuhan Perangkat

| Perangkat | Spesifikasi Minimum |
|---|---|
| PC / Laptop Admin | Browser Chrome terbaru, koneksi internet |
| Smartphone Guru | Android 8+ atau iOS 13+, App AppSheet terinstall |
| Koneksi Internet | Min. 4G / WiFi stabil untuk upload dokumen |

### 9.3 Batasan AppSheet Free Plan

| Fitur | Free | Core |
|---|---|---|
| Jumlah pengguna | 10 | Tidak terbatas |
| Automation Bot | Terbatas | Penuh |
| Report PDF | Tidak tersedia | Tersedia |
| Branding kustom | Tidak | Ya |

> **Rekomendasi:** Mulai dengan Free Plan untuk testing. Upgrade ke Core saat sudah siap produksi.

---

## 10. ROADMAP IMPLEMENTASI

### Fase 1 — Persiapan (Minggu 1–2)
- [ ] Buat akun Google Workspace / siapkan akun Gmail sekolah
- [ ] Buat struktur folder Google Drive
- [ ] Buat file Google Sheets master (semua tabel)
- [ ] Buat Google Forms untuk jurnal dan input nilai

### Fase 2 — Pembangunan Aplikasi (Minggu 3–4)
- [ ] Daftar & setup AppSheet dengan akun Google
- [ ] Hubungkan semua Google Sheets sebagai data source
- [ ] Buat Views utama (Dashboard, Tabel, Form, Kalender)
- [ ] Konfigurasi Role & Security Filter
- [ ] Setup Automation Bot (notifikasi)

### Fase 3 — Uji Coba & Revisi (Minggu 5–6)
- [ ] Testing dengan 3–5 guru sebagai pengguna awal
- [ ] Perbaikan berdasarkan feedback pengguna
- [ ] Pelatihan singkat untuk seluruh guru
- [ ] Dokumentasi panduan penggunaan

### Fase 4 — Produksi Penuh (Minggu 7+)
- [ ] Roll-out ke seluruh guru dan staf
- [ ] Monitoring penggunaan secara berkala
- [ ] Evaluasi dan pengembangan fitur lanjutan

---

## 11. RISIKO & MITIGASI

| Risiko | Tingkat | Mitigasi |
|---|---|---|
| Guru tidak terbiasa teknologi | Sedang | Pelatihan + panduan singkat (video/PDF) |
| Koneksi internet tidak stabil | Tinggi | AppSheet mendukung mode offline terbatas |
| Data hilang / terhapus tidak sengaja | Rendah | Google Sheets punya riwayat versi otomatis |
| Kapasitas Drive penuh | Sedang | Monitoring rutin, kompresi file dokumen |
| Kebocoran data | Rendah | Security filter AppSheet + share terbatas |

---

## 12. KONTAK & PENGELOLA SISTEM

| Peran | Tanggung Jawab |
|---|---|
| **Admin Utama (Wakasek Kurikulum)** | Kelola seluruh sistem, user management |
| **Admin Cadangan** | Staf TU / Operator sekolah |
| **Super Admin** | Kepala Sekolah (akses darurat) |

---

*Dokumen ini adalah referensi teknis utama. Perbarui secara berkala setiap ada perubahan struktur sistem.*

---
**© Aplikasi Kurikulum SMK — Dikembangkan dengan Google AppSheet & Google Workspace**
