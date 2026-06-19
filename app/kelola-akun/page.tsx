"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  UserPlus,
  Trash2,
  Shield,
  User as UserIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { getDbSafe, withSecondaryAuth, nipToEmail } from "@/lib/firebase";
import { Role } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
interface TeacherAccount {
  uid: string;
  nip: string;
  name: string;
  role: Role;
}

export default function ManageAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState({ nip: "", name: "", password: "", role: "TEACHER" as Role });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAccounts = async () => {
    setLoadingList(true);
    try {
      const q = query(collection(getDbSafe(), "users"), orderBy("name"));
      const snap = await getDocs(q);
      setAccounts(
        snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<TeacherAccount, "uid">) }))
      );
    } catch {
      setError("Gagal memuat daftar akun.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setSubmitting(true);
    try {
      // Buat akun di instance Firebase kedua agar sesi admin tidak ketendang.
      const newUid = await withSecondaryAuth(async (secondaryAuth) => {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          nipToEmail(form.nip),
          form.password
        );
        return cred.user.uid;
      });

      // Simpan profil & role di Firestore.
      await setDoc(doc(getDbSafe(), "users", newUid), {
        nip: form.nip.trim(),
        name: form.name.trim(),
        role: form.role,
      });

      setSuccess(`Akun untuk ${form.name.trim()} berhasil dibuat.`);
      setForm({ nip: "", name: "", password: "", role: "TEACHER" });
      await loadAccounts();
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("NIP ini sudah terdaftar.");
      } else if (code === "auth/weak-password") {
        setError("Kata sandi terlalu lemah (minimal 6 karakter).");
      } else {
        setError("Gagal membuat akun. Coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (acc: TeacherAccount) => {
    if (acc.uid === user?.uid) return; // jangan hapus diri sendiri
    if (!window.confirm(`Hapus profil akun ${acc.name}? Tindakan ini menghapus data profil & rolenya.`)) {
      return;
    }
    try {
      // Catatan: ini menghapus profil/role di Firestore. Penghapusan kredensial
      // login (Firebase Auth) tidak bisa dilakukan dari sisi client untuk user lain;
      // lakukan dari Firebase Console atau Admin SDK bila perlu mencabut login total.
      await deleteDoc(doc(getDbSafe(), "users", acc.uid));
      await loadAccounts();
    } catch {
      setError("Gagal menghapus akun.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Kelola Akun</h3>
        <p className="text-sm text-gray-500">Buat dan kelola akun guru beserta hak aksesnya</p>
      </div>

      {/* Form buat akun */}
      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
        <h4 className="flex items-center gap-2 text-md font-semibold text-gray-800 mb-4">
          <UserPlus size={18} className="text-primary-600" />
          Buat Akun Baru
        </h4>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 size={18} /> <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">NIP / Username</label>
              <input
                type="text"
                required
                value={form.nip}
                onChange={(e) => setForm((p) => ({ ...p, nip: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="cth: 198765"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="cth: Budi Santoso"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Kata Sandi Awal</label>
              <input
                type="text"
                required
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="minimal 6 karakter"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Hak Akses</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="TEACHER">Guru</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              Buat Akun
            </button>
          </div>
        </form>
      </div>

      {/* Daftar akun */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">NIP</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hak Akses</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loadingList ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Memuat...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  Belum ada akun.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{acc.name}</td>
                  <td className="px-6 py-4 text-gray-600">{acc.nip}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        acc.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {acc.role === "ADMIN" ? <Shield size={12} /> : <UserIcon size={12} />}
                      {acc.role === "ADMIN" ? "Admin" : "Guru"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {acc.uid !== user?.uid && (
                      <button
                        onClick={() => handleDelete(acc)}
                        className="p-2 hover:bg-red-100 rounded-lg"
                        title="Hapus"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
