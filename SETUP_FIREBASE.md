# Panduan Setup Firebase (Login Guru & Admin)

Aplikasi ini memakai **Firebase Authentication** (login) + **Cloud Firestore** (menyimpan role/profil).
Ikuti langkah berikut sekali saja. Perkiraan waktu: 10-15 menit.

---

## 1. Buat project Firebase

1. Buka https://console.firebase.google.com lalu login dengan akun Google-mu.
2. Klik **Add project** / **Tambah project**, beri nama (mis. `kurikulum-smk`), lanjut sampai selesai.
   (Google Analytics boleh dimatikan, tidak diperlukan.)

## 2. Aktifkan metode login Email/Password

1. Di menu kiri: **Build > Authentication** > klik **Get started**.
2. Tab **Sign-in method** > pilih **Email/Password** > **Enable** (yang atas saja) > **Save**.

> Kita memakai login NIP, tapi di balik layar NIP dipetakan ke email internal
> `NIP@kurikulum-smk.local`. Jadi provider yang dipakai tetap Email/Password.
> Guru tidak pernah melihat email itu — mereka hanya mengetik NIP.

## 3. Aktifkan Cloud Firestore

1. Di menu kiri: **Build > Firestore Database** > **Create database**.
2. Pilih lokasi terdekat (mis. `asia-southeast2` / Jakarta).
3. Mulai dengan **Production mode**, lalu ganti rules-nya (lihat langkah 6).

## 4. Daftarkan aplikasi web & salin config

1. Di **Project settings** (ikon gerigi di kiri atas) > tab **General**.
2. Bagian **Your apps** > klik ikon **</>** (Web) > beri nama > **Register app**.
3. Akan muncul objek `firebaseConfig`. Salin nilainya.
4. Di folder proyek, salin file `.env.local.example` menjadi **`.env.local`** lalu isi:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kurikulum-smk.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=kurikulum-smk
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kurikulum-smk.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
   NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

5. **Hentikan dan jalankan ulang** `npm run dev` agar `.env.local` terbaca.

## 5. Buat akun ADMIN pertama (manual, sekali saja)

Akun pertama harus dibuat manual karena halaman "Kelola Akun" hanya bisa diakses admin.

**a. Buat user di Authentication:**
1. **Authentication > Users > Add user**.
2. Email: gunakan format NIP + domain internal, mis. `admin@kurikulum-smk.local`
   (kalau NIP admin `198501`, isi `198501@kurikulum-smk.local`).
3. Password: isi password yang kamu mau. Klik **Add user**.
4. **Salin UID** user yang baru dibuat (ada di kolom User UID).

**b. Buat profil + role di Firestore:**
1. **Firestore Database > Start collection**.
2. Collection ID: **`users`**.
3. Document ID: **tempel UID** dari langkah di atas (HARUS sama persis).
4. Tambah field berikut (semuanya tipe **string**):
   - `nip` = `198501` (NIP yang sama, tanpa domain)
   - `name` = `Nama Admin`
   - `role` = `ADMIN`  ← huruf besar semua, penting
5. **Save**.

Sekarang buka aplikasi (`http://localhost:3000`), login dengan **NIP `198501`** + password tadi.
Kamu masuk sebagai admin dan melihat semua menu, termasuk **Kelola Akun**.

## 6. Aturan keamanan Firestore (penting)

Di **Firestore > Rules**, tempel aturan ini lalu **Publish**. Aturan ini memastikan
hanya admin yang bisa membuat/mengubah akun, dan guru hanya bisa membaca profilnya sendiri:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
    match /users/{uid} {
      // User boleh membaca profilnya sendiri; admin boleh membaca semua.
      allow read: if isSignedIn() && (request.auth.uid == uid || isAdmin());
      // Hanya admin yang boleh membuat/mengubah/menghapus akun & role.
      allow write: if isAdmin();
    }
  }
}
```

> Aturan ini adalah penjaga sebenarnya. Menyembunyikan menu di aplikasi hanya untuk
> tampilan; Firestore Rules yang memastikan guru tidak bisa mengubah role-nya sendiri
> meski mencoba lewat cara teknis.

---

## Cara kerja setelah setup

- **Admin**: login dengan NIP-nya, melihat semua menu. Buat akun guru lewat menu **Kelola Akun**.
- **Guru**: login dengan NIP-nya, hanya melihat:
  - **Kurikulum > Perangkat Pembelajaran** (hanya tab *Submit Perangkat*)
  - **Jurnal > Jurnal Mengajar** (hanya tab *Format Jurnal Mengajar*)

## Membuat akun guru (sebagai admin)

1. Login sebagai admin > menu **Kelola Akun**.
2. Isi NIP, nama, password awal, pilih hak akses **Guru**, klik **Buat Akun**.
3. Beri tahu guru NIP + password awalnya. Selesai.

## Catatan

- Menghapus akun di menu Kelola Akun menghapus **profil & role** (Firestore). Untuk mencabut
  login sepenuhnya, hapus juga user-nya di **Authentication > Users** di Firebase Console.
- File `.env.local` berisi konfigurasi dan tidak ikut ter-commit (sudah diabaikan git).
