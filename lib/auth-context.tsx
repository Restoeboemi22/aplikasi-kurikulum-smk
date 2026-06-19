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
import { doc, getDoc } from "firebase/firestore";
import { getAuthSafe, getDbSafe, nipToEmail, isFirebaseConfigured } from "@/lib/firebase";
import { Role } from "@/lib/permissions";

export interface AppUser {
  uid: string;
  nip: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (nip: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(fbUser: FirebaseUser): Promise<AppUser> {
  // Profil & role disimpan di Firestore koleksi "users", doc id = uid.
  const snap = await getDoc(doc(getDbSafe(), "users", fbUser.uid));
  const data = snap.exists() ? snap.data() : {};
  return {
    uid: fbUser.uid,
    nip: (data.nip as string) ?? fbUser.email?.split("@")[0] ?? "",
    name: (data.name as string) ?? "Pengguna",
    // Default ke TEACHER bila role tidak diset, demi keamanan (least privilege).
    role: (data.role as Role) === "ADMIN" ? "ADMIN" : "TEACHER",
  };
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
          setUser(await loadProfile(fbUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (nip: string, password: string) => {
    await signInWithEmailAndPassword(getAuthSafe(), nipToEmail(nip), password);
  };

  const logout = async () => {
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
