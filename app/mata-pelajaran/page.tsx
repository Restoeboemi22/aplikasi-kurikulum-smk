"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, X, Loader2 } from "lucide-react";
import { DEFAULT_SUBJECTS } from "@/lib/default-subjects";

interface Subject {
  id: string;
  code: string;
  name: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeedingDefaults, setIsSeedingDefaults] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
  });

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!formData.code || !formData.name) {
      alert("Kode dan nama mata pelajaran wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { id: editingId, ...formData } : formData;
      
      const res = await fetch("/api/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchSubjects();
        setMessage({
          text: isEditing ? "Mata pelajaran berhasil diperbarui." : "Mata pelajaran berhasil ditambahkan.",
          type: "success",
        });
        resetForm();
      } else {
        const error = await res.json();
        alert(error.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error saving subject:", error);
      alert("Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm("Isi daftar mata pelajaran default sesuai kurikulum umum SMK?")) return;

    setIsSeedingDefaults(true);
    setMessage(null);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults: true }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || "Gagal menambahkan data mata pelajaran default.");
      }

      await fetchSubjects();
      setMessage({
        text:
          result?.createdCount > 0
            ? `${result.createdCount} dari ${result.totalDefaults} mata pelajaran default berhasil ditambahkan.`
            : "Semua mata pelajaran default sudah ada.",
        type: "success",
      });
    } catch (error: any) {
      setMessage({
        text: error.message || "Gagal menambahkan data mata pelajaran default.",
        type: "error",
      });
    } finally {
      setIsSeedingDefaults(false);
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingId(subject.id);
    setFormData({ code: subject.code, name: subject.name });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus mata pelajaran ini?")) return;

    try {
      const res = await fetch(`/api/subjects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSubjects();
      } else {
        const error = await res.json();
        alert(error.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
      alert("Terjadi kesalahan saat menghapus data");
    }
  };

  const resetForm = () => {
    setFormData({ code: "", name: "" });
    setIsEditing(false);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Data Mata Pelajaran</h3>
          <p className="text-sm text-gray-500">Kelola daftar mata pelajaran SMK</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={isSeedingDefaults}
            className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-primary-700 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSeedingDefaults ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Isi Mapel Default
          </button>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus size={18} />
            Tambah Mata Pelajaran
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Daftar default berisi {DEFAULT_SUBJECTS.length} mata pelajaran umum SMK sesuai daftar acuan terbaru.
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kode</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Mata Pelajaran</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                  <Loader2 size={20} className="animate-spin inline mr-2" /> Memuat data...
                </td>
              </tr>
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                  Belum ada data mata pelajaran. Klik "Isi Mapel Default" untuk memuat daftar awal, atau tambahkan manual.
                </td>
              </tr>
            ) : (
              subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600 font-mono">{subject.code}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{subject.name}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="p-2 hover:bg-gray-100 rounded-lg" 
                        title="Lihat Detail"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-blue-100 rounded-lg" 
                        title="Edit"
                        onClick={() => handleEditSubject(subject)}
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-red-100 rounded-lg" 
                        title="Hapus"
                        onClick={() => handleDeleteSubject(subject.id)}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kode Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                  placeholder="Contoh: MTK"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Contoh: Matematika"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddSubject}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
