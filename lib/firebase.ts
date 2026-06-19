import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// True bila env Firebase sudah diisi. Dipakai untuk menampilkan pesan
// yang ramah ketika project belum dikonfigurasi, alih-alih crash.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getApp_(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

// Auth & Firestore di-init malas (lazy) supaya import modul ini tidak
// langsung melempar error saat env belum diisi (mis. ketika SSR).
export function getAuthSafe(): Auth {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi variabel NEXT_PUBLIC_FIREBASE_* di .env.local");
  }
  if (!_auth) _auth = getAuth(getApp_());
  return _auth;
}

export function getDbSafe(): Firestore {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi. Isi variabel NEXT_PUBLIC_FIREBASE_* di .env.local");
  }
  if (!_db) _db = getFirestore(getApp_());
  return _db;
}

// Domain sintetis untuk memetakan NIP -> email internal Firebase.
// Guru hanya mengetik NIP; email ini tidak pernah mereka lihat.
export const NIP_EMAIL_DOMAIN = "kurikulum-smk.local";

export function nipToEmail(nip: string): string {
  return `${nip.trim().toLowerCase()}@${NIP_EMAIL_DOMAIN}`;
}

/**
 * Membuat akun guru tanpa mengganggu sesi admin yang sedang login.
 *
 * Firebase Auth client otomatis "login sebagai" user yang baru dibuat lewat
 * createUserWithEmailAndPassword. Untuk menghindari sesi admin ketendang, kita
 * jalankan pembuatan akun di instance Firebase kedua yang terisolasi, lalu
 * hapus instance itu setelah selesai.
 */
export async function withSecondaryAuth<T>(
  fn: (secondaryAuth: Auth) => Promise<T>
): Promise<T> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    return await fn(secondaryAuth);
  } finally {
    await deleteApp(secondaryApp);
  }
}
