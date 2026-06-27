"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Eye, X, Printer, Save, Loader2, CalendarDays, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type GuidanceEntry = {
  id: string;
  no: number;
  day: string;
  date: string;
  keterangan: string;
  teacherId?: string;
  teacherName: string;
  notes?: string;
};

const KETERANGAN_OPTIONS = ["Telat", "Ijin", "Alpa"];

const getDayName = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  const day = date.toLocaleDateString("id-ID", { weekday: "long" });
  return day.charAt(0).toUpperCase() + day.slice(1);
};

const getKeteranganColor = (keterangan: string) => {
  switch (keterangan) {
    case "Telat":
      return "bg-yellow-100 text-yellow-700";
    case "Ijin":
      return "bg-blue-100 text-blue-700";
    case "Alpa":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const createDefaultForm = () => ({
  id: "",
  teacherId: "",
  teacherName: "",
  date: "",
  keterangan: "Telat",
  notes: "",
});

export default function GuidanceBookPage() {
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const [guidances, setGuidances] = useState<GuidanceEntry[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null);
  const [formData, setFormData] = useState(createDefaultForm());

  const loadGuidanceData = async () => {
    setLoading(true);
    setError("");
    try {
      const [entriesRes, teachersRes] = await Promise.all([
        fetch("/api/guidance-book", { cache: "no-store" }),
        fetch("/api/teachers", { cache: "no-store" }),
      ]);

      const [entriesData, teachersData] = await Promise.all([
        entriesRes.json().catch(() => []),
        teachersRes.json().catch(() => []),
      ]);

      if (!entriesRes.ok) {
        throw new Error(entriesData?.error || "Gagal memuat buku pembinaan.");
      }

      setGuidances(Array.isArray(entriesData) ? entriesData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
    } catch (err: any) {
      setGuidances([]);
      setTeachers([]);
      setError(err.message || "Gagal memuat buku pembinaan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuidanceData();
  }, []);

  const teacherOptions = useMemo(
    () =>
      [...teachers].sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "id")),
    [teachers]
  );

  const resetForm = () => setFormData(createDefaultForm());

  const closeModal = () => {
    setModalMode(null);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
  };

  const openEditModal = (entry: GuidanceEntry) => {
    setFormData({
      id: entry.id,
      teacherId: entry.teacherId || "",
      teacherName: entry.teacherName,
      date: entry.date,
      keterangan: entry.keterangan,
      notes: entry.notes || "",
    });
    setModalMode("edit");
  };

  const openViewModal = (entry: GuidanceEntry) => {
    setFormData({
      id: entry.id,
      teacherId: entry.teacherId || "",
      teacherName: entry.teacherName,
      date: entry.date,
      keterangan: entry.keterangan,
      notes: entry.notes || "",
    });
    setModalMode("view");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/guidance-book", {
        method: modalMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan catatan pembinaan.");
      }

      await loadGuidanceData();
      setSuccess(modalMode === "edit" ? "Catatan pembinaan berhasil diperbarui." : "Catatan pembinaan berhasil ditambahkan.");
      closeModal();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan catatan pembinaan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGuidance = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus catatan pembinaan ini?")) return;

    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/guidance-book?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal menghapus catatan pembinaan.");
      }

      await loadGuidanceData();
      setSuccess("Catatan pembinaan berhasil dihapus.");
    } catch (err: any) {
      setError(err.message || "Gagal menghapus catatan pembinaan.");
    }
  };

  if (role !== "ADMIN") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Halaman buku pembinaan saat ini hanya dapat diakses oleh admin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Buku Pembinaan Guru</h3>
          <p className="text-sm text-gray-500">Catatan pembinaan untuk keterlambatan, izin, dan alpa guru langsung dari database.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
          >
            <Printer size={18} />
            Cetak Laporan
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700"
          >
            <Plus size={18} />
            Tambah Catatan
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-10 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Memuat buku pembinaan...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Guru</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Keterangan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Catatan</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {guidances.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{item.no}</td>
                    <td className="px-6 py-4 text-gray-600">{item.day}</td>
                    <td className="px-6 py-4 text-gray-600">{item.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.teacherName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getKeteranganColor(item.keterangan)}`}>
                        {item.keterangan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.notes?.trim() ? item.notes : "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openViewModal(item)} className="rounded-lg p-2 hover:bg-gray-100" title="Lihat Detail">
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button onClick={() => openEditModal(item)} className="rounded-lg p-2 hover:bg-blue-100" title="Edit">
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteGuidance(item.id)}
                          className="rounded-lg p-2 hover:bg-red-100"
                          title="Hapus"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {guidances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                      Belum ada catatan pembinaan guru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {modalMode === "create" ? "Tambah Catatan Pembinaan" : modalMode === "edit" ? "Edit Catatan Pembinaan" : "Detail Catatan Pembinaan"}
                </h3>
                <p className="text-sm text-gray-500">Data pembinaan tersimpan ke database dan bisa dipantau kembali.</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 hover:bg-gray-100">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Nama Guru</label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => {
                      const selectedTeacher = teacherOptions.find((teacher: any) => String(teacher.id) === e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        teacherId: e.target.value,
                        teacherName: selectedTeacher?.name || "",
                      }));
                    }}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    <option value="">Pilih guru</option>
                    {teacherOptions.map((teacher: any) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Hari</label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
                    <CalendarDays size={16} className="text-gray-500" />
                    {formData.date ? getDayName(formData.date) : "-"}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Keterangan</label>
                  <select
                    value={formData.keterangan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, keterangan: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    {KETERANGAN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Catatan Tambahan</label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    disabled={modalMode === "view"}
                    placeholder="Opsional, misalnya kronologi atau tindak lanjut pembinaan"
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText size={16} />
                Catatan pembinaan disimpan di database utama aplikasi.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  {modalMode === "view" ? "Tutup" : "Batal"}
                </button>
                {modalMode !== "view" && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
