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

async function loadProfile(): Promise<AppUser> {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Gagal memuat profil session.");
  }

  const result = await response.json();
  const user = result.user;

  return {
    uid: user.uid,
    nip: user.nip ?? "",
    name: user.name ?? "Pengguna",
    role: (user.role as Role) === "ADMIN" ? "ADMIN" : "TEACHER",
    isHomeroomTeacher: Boolean(user.isHomeroomTeacher),
    homeroomClassNames: Array.isArray(user.homeroomClassNames) ? user.homeroomClassNames : [],
  };
}

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

async function syncServerSession(fbUser: FirebaseUser): Promise<AppUser> {
  const idToken = await fbUser.getIdToken();

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || "Gagal menyinkronkan session server.");
  }

  const result = await response.json().catch(() => null);
  if (!result?.user) {
    throw new Error("Profil session server tidak ditemukan.");
  }

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
          const sessionUser = await syncServerSession(fbUser);
          setUser(sessionUser);
        } catch {
          try {
            const profileUser = await loadProfile();
            setUser(profileUser);
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
