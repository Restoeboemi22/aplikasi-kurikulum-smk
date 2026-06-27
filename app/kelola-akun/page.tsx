"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  User as UserIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Role } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";

interface TeacherAccount {
  id: string;
  nip: string;
  name: string;
  email: string;
  role: Role;
  teacherId: string | null;
  teacherCode: string | null;
  gradeCount: number;
  journalCount: number;
}

const EMPTY_FORM = {
  id: "",
  nip: "",
  name: "",
  email: "",
  role: "TEACHER" as Role,
};

export default function ManageAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isEditing = Boolean(form.id);

  const loadAccounts = async () => {
    setLoadingList(true);
    setError("");
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat daftar akun.");
      }

      setAccounts(result);
    } catch (error: any) {
      setError(error.message || "Gagal memuat daftar akun.");
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

    setSubmitting(true);
    try {
      const payload = {
        id: form.id,
        nip: form.nip.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };

      const response = await fetch("/api/users", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 404 && isEditing) {
          setForm({ ...EMPTY_FORM });
          await loadAccounts();
          throw new Error("Akun yang sedang Anda ubah sudah tidak ada. Daftar akun telah diperbarui.");
        }
        throw new Error(result?.error || "Gagal menyimpan akun.");
      }

      setSuccess(
        isEditing
          ? `Perubahan akun ${payload.name} berhasil disimpan.`
          : `Akun ${payload.name} berhasil dibuat.`
      );
      setForm({ ...EMPTY_FORM });
      await loadAccounts();
    } catch (error: any) {
      setError(error.message || "Gagal menyimpan akun.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (account: TeacherAccount) => {
    setError("");
    setSuccess("");
    setForm({
      id: account.id,
      nip: account.nip,
      name: account.name,
      email: account.email,
      role: account.role,
    });
  };

  const handleCancelEdit = () => {
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccess("");
  };

  const handleDelete = async (acc: TeacherAccount) => {
    if (acc.id === user?.uid) return;
    if (!window.confirm(`Hapus akun ${acc.name}? Tindakan ini hanya menghapus akun aplikasi yang tidak lagi terhubung ke data lain.`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/users?id=${acc.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 404) {
          if (form.id === acc.id) {
            setForm({ ...EMPTY_FORM });
          }
          await loadAccounts();
          setSuccess(`Akun ${acc.name} sudah tidak ada. Daftar akun telah diperbarui.`);
          return;
        }
        throw new Error(result?.error || "Gagal menghapus akun.");
      }

      setSuccess(`Akun ${acc.name} berhasil dihapus.`);
      await loadAccounts();
    } catch (error: any) {
      setError(error.message || "Gagal menghapus akun.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Kelola Akun</h3>
        <p className="text-sm text-gray-500">Kelola identitas akun aplikasi dan role yang dibaca server-side</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl">
        <h4 className="flex items-center gap-2 text-md font-semibold text-gray-800 mb-4">
          {isEditing ? <Pencil size={18} className="text-primary-600" /> : <UserPlus size={18} className="text-primary-600" />}
          {isEditing ? "Ubah Akun" : "Buat Akun Baru"}
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
              <label className="text-sm font-medium text-gray-700">Email Login</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="opsional, kosongkan untuk auto-generate"
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
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Role dan profil akun di halaman ini disimpan di database aplikasi. Jika email dikosongkan,
            sistem akan membuat email internal dari NIP. Jika akun terhubung ke `Data Guru`,
            perubahan nama/NIP di sini langsung ikut terbaca pada halaman guru.
          </div>
          <div className="flex justify-end gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isEditing ? (
                <Pencil size={18} />
              ) : (
                <UserPlus size={18} />
              )}
              {isEditing ? "Simpan Perubahan" : "Buat Akun"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">NIP</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hak Akses</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Relasi Data</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loadingList ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Memuat...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Belum ada akun.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <span>{acc.name}</span>
                      {acc.id === user?.uid && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Anda
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{acc.nip}</td>
                  <td className="px-6 py-4 text-gray-600">{acc.email}</td>
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
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {acc.teacherId ? `Guru ${acc.teacherCode || "-"}` : "Belum terhubung ke data guru"}
                    <div className="text-xs text-gray-400">
                      {acc.gradeCount} nilai • {acc.journalCount} jurnal
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(acc)}
                        className="p-2 hover:bg-blue-100 rounded-lg"
                        title="Ubah"
                      >
                        <Pencil size={16} className="text-blue-600" />
                      </button>
                      {acc.id !== user?.uid && (
                        <button
                          onClick={() => handleDelete(acc)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      )}
                    </div>
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
