# Debug Session: admin-guru-smoketest

Status: OPEN

## Tujuan
- Melakukan smoke test manual pada menu admin dan guru.
- Menemukan bug runtime, state kosong yang rusak, filter yang tidak sinkron, dan aksi simpan/refresh yang gagal.
- Memastikan tidak ada dummy yang masih bocor ke UI saat runtime.

## Gejala Awal
- Belum ada satu gejala tunggal; sesi ini adalah audit runtime menyeluruh setelah pembersihan dummy dan penyatuan sumber data.

## Hipotesis
1. Beberapa halaman admin/guru masih gagal saat runtime karena asumsi data tidak kosong, terutama setelah dummy dihapus.
2. Ada menu yang membaca sumber data berbeda antara API, `localStorage`, dan state komponen sehingga filter/simpan/refresh tidak sinkron.
3. Beberapa halaman yang baru dipindahkan ke API nyata belum menangani respons kosong atau error fetch dengan aman.
4. Dev server atau build lokal mungkin lolos, tetapi ada bug interaksi yang hanya muncul saat navigasi antar menu dilakukan secara berurutan.
5. Ada menu yang masih merender label/rekap statis meski data dasarnya sudah kosong atau berubah.

## Rencana
1. Nyalakan server lokal.
2. Buka dan cek menu admin/guru satu per satu.
3. Catat gejala aktual yang berhasil direproduksi.
4. Tambahkan instrumentasi minimal jika dibutuhkan.
5. Perbaiki penyebab dengan perubahan sekecil mungkin.

## Bukti
- Belum ada log runtime yang dikumpulkan.

## Status Perbaikan
- Belum ada.
