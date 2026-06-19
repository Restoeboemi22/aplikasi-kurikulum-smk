# Aplikasi Kurikulum SMK

Sistem Manajemen Kurikulum SMK Terintegrasi Google Workspace.

## Fitur Utama

- 📚 **Manajemen Kurikulum**: Kelola CP, TP, ATP, dan Silabus
- 📅 **Jadwal Pelajaran**: Atur jadwal mengajar guru
- 📝 **Jurnal Mengajar**: Catat kegiatan belajar mengajar harian
- 📊 **Penilaian Siswa**: Input dan kelola nilai siswa
- 🔄 **Integrasi Google Workspace**: Sinkronisasi dengan Google Sheets, Drive, dan Calendar
- 🔐 **Role-Based Access**: Hak akses berbeda untuk Admin, Guru, Kepala Sekolah, dan Siswa

## Teknologi

- **Framework**: Next.js 15 (App Router)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS
- **ORM**: Prisma
- **Database**: SQLite (Development)
- **Icons**: Lucide React

## Cara Memulai

### 1. Instalasi Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
npx prisma generate
npx prisma db push
```

### 3. Jalankan Aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Struktur Proyek

```
aplikasi-kurikulum-smk/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Halaman Dashboard
│   ├── kurikulum/         # Halaman Kurikulum
│   ├── jadwal/            # Halaman Jadwal
│   ├── jurnal/            # Halaman Jurnal
│   ├── nilai/             # Halaman Nilai
│   ├── layout.tsx         # Layout utama
│   ├── page.tsx           # Halaman utama (sidebar + content)
│   └── globals.css        # Global styles
├── prisma/
│   └── schema.prisma      # Database schema
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Integrasi Google Workspace

Untuk mengaktifkan integrasi dengan Google Workspace:

1. Buat project di [Google Cloud Console](https://console.cloud.google.com/)
2. Aktifkan Google Sheets API, Google Drive API, dan Google Calendar API
3. Buat credentials OAuth 2.0
4. Tambahkan environment variables:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=your_redirect_uri
   ```

## Roadmap

- [ ] Autentikasi Google OAuth
- [ ] Sinkronisasi data dengan Google Sheets
- [ ] Upload file ke Google Drive
- [ ] Integrasi Google Calendar
- [ ] Export laporan PDF
- [ ] Notifikasi email otomatis

## Lisensi

MIT
