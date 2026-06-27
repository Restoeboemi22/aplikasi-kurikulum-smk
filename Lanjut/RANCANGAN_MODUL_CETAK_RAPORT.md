# Rancangan Modul Cetak Raport

Terakhir diperbarui: 20 Juni 2026

Dokumen ini sekarang berfungsi sebagai gabungan antara rancangan awal dan catatan implementasi aktual modul `Cetak Raport` yang sudah aktif di aplikasi.

---

## 1. Status Implementasi Saat Ini

Per 20 Juni 2026, modul `Cetak Raport` sudah aktif dan bukan lagi sekadar blueprint.

Yang sudah berjalan:

- menu dipisah menjadi `Cetak Raport TKJ` dan `Cetak Raport TKR`
- admin dapat mengakses seluruh kelas sesuai jalur raport
- guru hanya dapat mengakses menu raport jika tercatat sebagai `wali kelas`
- filter `tahun ajaran -> semester -> kelas -> siswa` sudah aktif
- preview raport sudah terhubung ke nilai riil dari menu `Penilaian`
- `NISN` siswa sudah tampil pada identitas raport
- deskripsi CP sudah dibentuk otomatis dari `TP (Tujuan Pembelajaran)` dan nilai akhir
- data pelengkap raport sudah bisa diisi dan disimpan
- finalisasi raport sudah tersedia
- print memakai layout `A4 portrait`
- header raport memakai asset `KOP SMK.png`

Dokumen ini tetap menyimpan arah pengembangan berikutnya, tetapi bagian "kondisi saat ini" harus dianggap sebagai sumber status yang paling akurat.

---

## 2. Tujuan Modul

Modul `Cetak Raport` dipakai untuk:

- menarik identitas siswa dari master data
- menarik nilai riil dari modul `Penilaian`
- menghitung nilai akhir raport per mata pelajaran
- membentuk deskripsi `Capaian Pembelajaran`
- menyimpan data pelengkap seperti absensi, pengembangan diri, kepribadian, dan catatan wali
- mengatur alur `preview -> simpan pelengkap -> finalisasi -> print`

Prinsip utamanya:

- nilai mentah tetap berasal dari `Grade`
- raport tidak berdiri sendiri dari sisi data
- preview harus bisa selalu dibentuk ulang dari sumber nilai aktif
- akses guru dibatasi hanya untuk kelas yang memang diwalikan

---

## 3. Modul dan Berkas Aktif

Implementasi raport aktif saat ini tersebar di berkas berikut:

- `app/penilaian-raport/page.tsx`
- `app/penilaian-raport/report-card-page.tsx`
- `app/penilaian-raport-tkj/page.tsx`
- `app/penilaian-raport-tkr/page.tsx`
- `app/api/report-cards/options/route.ts`
- `app/api/report-cards/preview/route.ts`
- `app/api/report-cards/supplement/route.ts`
- `lib/report-card.ts`
- `lib/report-profiles.ts`

Peran utama tiap bagian:

- `report-card-page.tsx` menangani filter, preview, form data pelengkap, finalisasi, dan print
- `/api/report-cards/options` memuat kelas dan siswa sesuai hak akses user
- `/api/report-cards/preview` membangun payload raport dari data riil
- `/api/report-cards/supplement` menyimpan data pelengkap dan status finalisasi
- `lib/report-card.ts` memusatkan rumus, grouping mapel, akses wali kelas, dan builder deskripsi CP
- `lib/report-profiles.ts` memusatkan profil jalur `TKJ` dan `TKR`

---

## 4. Struktur Akses dan Jalur Raport

### 4.1 Role akses

Aturan akses aktif:

- `ADMIN` dapat melihat seluruh raport
- `TEACHER` hanya dapat membuka menu raport bila menjadi wali kelas
- guru wali kelas hanya dapat melihat siswa pada kelas yang diwalikan

Resolver akses memakai relasi:

- `User -> Teacher`
- `Teacher -> ClassMajor` melalui `homeroomTeacherId`

### 4.2 Pemisahan jalur raport

Modul raport sekarang sengaja dipisah agar jalur siswa tidak tercampur:

- `TKJ`
- `TKR`

Header tiap jalur diambil dari `report profile`:

- `TKJ`
  - Bidang Keahlian: `Teknologi Informasi`
  - Program Keahlian: `Teknik Jaringan Komputer & Telekomunikasi`
  - Konsentrasi Keahlian: `Teknik Komputer & Jaringan`
- `TKR`
  - Bidang Keahlian: `Teknologi Manufaktur & Rekayasa`
  - Program Keahlian: `Teknik Otomotif`
  - Konsentrasi Keahlian: `Teknik Kendaraan Ringan`

Dengan pola ini, kelas `TKJ` dan `TKR` dapat memakai mesin raport yang sama tetapi tetap memiliki identitas cetak yang berbeda.

---

## 5. Sumber Data yang Dipakai

### 5.1 Identitas siswa

Sumber:

- `Student`
- `ClassMajor`
- `report profile` jalur raport

Field yang sudah dipakai aktif:

- `student.id`
- `student.name`
- `student.nis`
- `student.nisn`
- `student.className`
- `classMajor.grade`
- `classMajor.majorCode`
- `classMajor.majorName`
- `classMajor.homeroomTeacher`

Nilai `fase` tidak disimpan langsung di tabel siswa, tetapi diturunkan dari tingkat kelas:

- `X -> E`
- `XI/XII -> F`

### 5.2 Nilai akademik

Sumber utama:

- `Grade`

Kategori nilai yang dipakai:

- `UH`
- `TUGAS`
- `STS`
- `SAS`
- `SIKAP`

### 5.3 Tujuan Pembelajaran dan deskripsi CP

Sumber:

- `TeachingObjective`

Deskripsi CP tidak diketik manual dari nol. Sistem membentuknya dari:

- nilai akhir mata pelajaran
- daftar `TP` mapel-kelas-periode
- aturan level capaian

Level capaian aktif:

- `93-100 = sangat baik`
- `85-92 = baik`
- `78-84 = cukup`
- `<78 = kurang`

Contoh pola hasil:

```text
Ananda cukup dalam ...
```

### 5.4 Data pelengkap raport

Sumber aktif:

- `ReportCardSupplement`

Field yang sudah aktif:

- `sakit`
- `izin`
- `alpha`
- `developmentPramuka`
- `developmentSholatDhuha`
- `personalityAkhlak`
- `personalityKerajinan`
- `personalityKerapian`
- `homeroomNote`
- `reportCity`
- `reportDate`
- `homeroomSignatureName`
- `homeroomSignatureTitle`
- `principalSignatureName`
- `principalSignatureTitle`
- `principalNip`
- `isFinalized`
- `finalizedAt`

---

## 6. Aturan Perhitungan Aktif

Rumus aktif saat ini berada di `lib/report-card.ts`.

### 6.1 Agregasi nilai

- `UH` = rata-rata `nilai1`, `nilai2`, `nilai3`
- `TUGAS` = rata-rata `nilai1`, `nilai2`, `nilai3`
- `STS` = `nilaiAkhir`
- `SAS` = `nilaiAkhir`
- `SIKAP` = `nilaiAkhir` untuk kolom non-angka

### 6.2 Rumus nilai akhir

Rumus aktif yang dipakai saat ini:

```text
finalScore = (UH * 0.30) + (TUGAS * 0.20) + (STS * 0.20) + (SAS * 0.30)
roundedScore = pembulatan(finalScore)
```

### 6.3 Aturan nilai belum lengkap

Jika salah satu komponen inti belum tersedia:

- `finalScore` tidak dibentuk
- kolom angka menampilkan status kosong / `-`
- deskripsi CP menampilkan keterangan bahwa data penilaian belum lengkap

Pendekatan ini dipilih agar raport tidak diam-diam menganggap nilai kosong sebagai `0`.

---

## 7. Pengelompokan Mata Pelajaran

Raport aktif memakai pengelompokan mapel di level helper, bukan tabel konfigurasi terpisah.

Group yang sudah dipakai:

- `A = Kelompok Mata Pelajaran Umum`
- `B = Mata Pelajaran Kejuruan`
- `L = Mata Pelajaran Lainnya`

Urutan mapel mengikuti helper `DEFAULT_SUBJECTS` dan `sortSubjects()` agar tabel raport tetap stabil dan tidak bergantung murni pada urutan input database.

Catatan:

- pendekatan ini sudah cukup untuk implementasi aktif
- bila nanti sekolah membutuhkan urutan yang sangat spesifik per tahun ajaran atau per jurusan, barulah `ReportSubjectConfig` layak ditambahkan

---

## 8. Alur Halaman Aktif

### 8.1 Filter awal

Filter yang sudah aktif:

- `Tahun Pelajaran`
- `Semester`
- `Kelas`
- `Siswa`

Alur:

1. Admin atau guru wali kelas membuka menu raport sesuai jalur
2. Sistem memuat daftar kelas yang boleh diakses user
3. User memilih `tahun ajaran`, `semester`, dan `kelas`
4. Sistem memuat daftar siswa pada kelas tersebut
5. User memilih siswa
6. Sistem membentuk preview raport dari data aktual

### 8.2 Preview raport

Saat preview dibentuk, sistem melakukan:

1. mengambil data siswa
2. memvalidasi kelas terhadap akses user
3. membaca data kelas dan wali kelas
4. membaca data pelengkap raport jika sudah pernah disimpan
5. membaca semua nilai `Grade` untuk semester terkait
6. membaca `TeachingObjective` yang cocok untuk mapel-kelas-periode
7. menghitung nilai akhir dan deskripsi CP
8. menyusun payload preview untuk ditampilkan dan dicetak

### 8.3 Form data pelengkap

Di halaman preview, user berwenang dapat mengisi:

- absensi
- pengembangan diri
- kepribadian
- catatan wali
- kota dan tanggal pembagian raport
- nama dan jabatan tanda tangan wali kelas
- nama, jabatan, dan NIP kepala sekolah

### 8.4 Finalisasi

Finalisasi aktif saat ini bekerja pada level `ReportCardSupplement`.

Maknanya:

- saat `isFinalized = true`, data pelengkap tidak bisa diubah
- user harus membatalkan finalisasi terlebih dahulu bila ingin mengedit lagi
- preview nilai masih dibangun dari `Grade` aktif, tetapi data pelengkap mengikuti status finalisasi terakhir

Catatan penting:

- finalisasi penuh berbasis snapshot item raport per mapel belum diterapkan
- pendekatan saat ini cukup untuk operasional sekarang, tetapi belum sekuat arsip raport permanen

### 8.5 Print

Mode print aktif memakai:

- `A4 portrait`
- header `KOP SMK.png`
- penyembunyian kontrol layar saat cetak
- penataan margin dan proporsi tabel agar lebih pas satu halaman

---

## 9. API Aktif

### 9.1 `GET /api/report-cards/options`

Fungsi:

- memuat kelas yang boleh diakses
- memuat daftar siswa berdasarkan kelas
- memfilter jalur raport `TKJ` atau `TKR`

### 9.2 `GET /api/report-cards/preview`

Input query:

- `studentId`
- `academicYear`
- `semester`
- `reportMajorCode`

Output utama:

- identitas siswa
- identitas kelas dan jalur keahlian
- ringkasan nilai
- tabel mapel terkelompok
- data pelengkap raport

### 9.3 `POST /api/report-cards/supplement`

Fungsi:

- menyimpan data pelengkap raport
- mengubah status finalisasi

Action yang aktif:

- simpan data pelengkap
- `toggle-finalization`

---

## 10. Struktur Data yang Sudah Aktif di Schema

Model yang sudah dipakai langsung oleh modul raport:

- `Student`
- `ClassMajor`
- `Grade`
- `TeachingObjective`
- `ReportCardSupplement`

`ReportCardSupplement` saat ini adalah tempat simpan resmi untuk:

- data non-akademik
- metadata tanda tangan
- tanggal pembagian raport
- status finalisasi

Ini berarti kekurangan terbesar yang masih tersisa bukan lagi absensi atau catatan, melainkan belum adanya snapshot akademik permanen per mapel.

---

## 11. Arah Pengembangan Berikutnya

Jika nanti dibutuhkan arsip raport yang benar-benar beku dan tahan revisi nilai di masa depan, pengembangan yang paling masuk akal adalah menambah model berikut:

- `ReportCard`
- `ReportCardItem`
- opsional `ReportSubjectConfig`

Manfaatnya:

- nilai per mapel dapat disimpan sebagai snapshot final
- revisi raport bisa ditelusuri lebih rapi
- perubahan nilai pada `Grade` tidak langsung memengaruhi raport yang sudah diarsipkan
- export atau cetak ulang raport lama menjadi lebih aman

Rancangan minimal yang direkomendasikan untuk fase lanjutan:

```prisma
model ReportCard {
  id                String   @id @default(cuid())
  studentId         String
  academicYear      String
  semester          String
  className         String
  majorCode         String
  status            String   @default("DRAFT")
  finalizedAt       DateTime?
  finalizedByUserId String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model ReportCardItem {
  id             String   @id @default(cuid())
  reportCardId   String
  subjectName    String
  groupCode      String
  orderNumber    Int
  uhAverage      Decimal? @db.Decimal(5,2)
  tugasAverage   Decimal? @db.Decimal(5,2)
  stsScore       Decimal? @db.Decimal(5,2)
  sasScore       Decimal? @db.Decimal(5,2)
  finalScore     Decimal? @db.Decimal(5,2)
  roundedScore   Int?
  competenceNote String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

Model di atas belum wajib untuk deploy saat ini, tetapi menjadi jalur paling sehat bila kebutuhan arsip raport makin ketat.

---

## 12. Kesimpulan

Status modul raport saat ini dapat diringkas sebagai berikut:

- mesin raport aktif dan terhubung ke data nilai riil
- jalur `TKJ` dan `TKR` sudah dipisah dengan profil header masing-masing
- `NISN`, TP, data pelengkap, finalisasi, dan print A4 sudah berjalan
- role wali kelas sudah dibatasi di server-side
- penyimpanan pelengkap raport sudah ada melalui `ReportCardSupplement`
- snapshot akademik permanen per mapel masih menjadi pengembangan lanjutan, bukan blocker untuk operasional sekarang

Dengan demikian, modul `Cetak Raport` sudah masuk fase produksi awal, sementara pengembangan berikutnya tinggal memperkuat sisi arsip dan versioning raport.
