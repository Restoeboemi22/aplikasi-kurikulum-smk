"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { getAuthSafe, loginUsernameToEmail, isFirebaseConfigured } from "@/lib/firebase";
import { Role } from "@/lib/permissions";

export interface AppUser {
  uid: string;
  nip: string;
  name: string;
  role: Role;
  isHomeroomTeacher: boolean;
  homeroomClassNames: string[];
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);



function mapSessionUser(user: any): AppUser {
  return {
    uid: user.uid,
    nip: user.nip ?? "",
    name: user.name ?? "Pengguna",
    role: (user.role as Role) === "ADMIN" ? "ADMIN" : "TEACHER",
    isHomeroomTeacher: Boolean(user.isHomeroomTeacher),
    homeroomClassNames: Array.isArray(user.homeroomClassNames) ? user.homeroomClassNames : [],
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function syncServerSession(fbUser: FirebaseUser): Promise<AppUser> {
  const idToken = await fbUser.getIdToken();

  const response = await fetchWithTimeout("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || "Gagal menyinkronkan session server.");
  }

  const data = await response.json();
  return mapSessionUser(data.user);
}

async function loadProfile(): Promise<AppUser> {
  const response = await fetchWithTimeout("/api/auth/me", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Gagal memuat profil session.");
  }
  const result = await response.json();
  return mapSessionUser(result.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bila Firebase belum dikonfigurasi, jangan crash: cukup berhenti loading
    // sehingga UI bisa menampilkan pesan setup.
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(getAuthSafe(), async (fbUser) => {
      if (fbUser) {
        try {
          // Coba muat profil dari session cookie lebih dulu (sangat cepat).
          // Kalau berhasil, berarti user hanya melakukan refresh halaman.
          const profileUser = await loadProfile();
          setUser(profileUser);
        } catch {
          // Jika gagal (mis. belum ada cookie karena baru saja login),
          // barulah sync idToken ke server untuk membuat session baru (lambat).
          try {
            const sessionUser = await syncServerSession(fbUser);
            setUser(sessionUser);
          } catch {
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (username: string, password: string) => {
    const credential = await signInWithEmailAndPassword(
      getAuthSafe(),
      loginUsernameToEmail(username),
      password
    );
    setUser(await syncServerSession(credential.user));
  };

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => null);
    await signOut(getAuthSafe());
  };

  return (
    <AuthContext.Provider value={{ user, loading, configured: isFirebaseConfigured, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
