"use client";

import { useEffect } from "react";

/**
 * Pembersih service worker & cache nyasar.
 *
 * Aplikasi ini TIDAK memakai service worker. Namun di localhost (atau domain
 * yang pernah dipakai aplikasi lain), bisa ada service worker lama yang nyangkut
 * dan mencegat permintaan halaman sehingga update terbaru tidak muncul / login
 * gagal. Komponen ini berjalan sekali di sisi browser untuk:
 *   1. Meng-unregister semua service worker yang terdaftar.
 *   2. Menghapus semua cache yang dibuat service worker tsb (Cache Storage API).
 *
 * Dengan begitu, pengguna selalu mendapat versi terbaru aplikasi tanpa perlu
 * membersihkan cache manual.
 */
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Unregister semua service worker.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((reg) => reg.unregister());
        })
        .catch(() => {
          /* abaikan: tidak kritis */
        });
    }

    // 2. Hapus semua cache lama (Cache Storage API).
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {
          /* abaikan: tidak kritis */
        });
    }
  }, []);

  return null;
}
