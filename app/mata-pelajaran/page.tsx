"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Loader2,
  BookOpen,
  Layers,
  Search,
  CheckCircle2,
  Info,
} from "lucide-react";
import { DEFAULT_SUBJECTS } from "@/lib/default-subjects";
import {
  getSubjectGroup,
  SUBJECT_GROUPS,
  sortSubjectsWithGroup,
  type SubjectGroupCode,
} from "@/lib/subject-groups";

interface Subject {
  id: string;
  code: string;
  name: string;
  groupCode?: SubjectGroupCode;
  groupName?: string;
  badgeLabel?: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeedingDefaults, setIsSeedingDefaults] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<"ALL" | SubjectGroupCode>("ALL");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
  });

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
          text: isEditing
            ? "Mata pelajaran berhasil diperbarui."
            : "Mata pelajaran berhasil ditambahkan.",
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
    if (
      !confirm(
        "Isi daftar mata pelajaran default (15 mapel sesuai kurikulum resmi SMKS Pacet)?"
      )
    )
      return;

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
            : "Semua mata pelajaran default sudah ada di database.",
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

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus mata pelajaran "${name}"?`)) return;

    try {
      const res = await fetch(`/api/subjects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSubjects();
        setMessage({
          text: `Mata pelajaran "${name}" berhasil dihapus.`,
          type: "success",
        });
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

  // Group and sort subjects
  const groupedData = useMemo(() => {
    const sorted = sortSubjectsWithGroup(subjects);
    const groups: Record<SubjectGroupCode, Subject[]> = {
      A: [],
      B: [],
      BK: [],
    };

    sorted.forEach((sub) => {
      const grp = getSubjectGroup(sub.name, sub.code);
      groups[grp.code].push({
        ...sub,
        groupCode: grp.code,
        groupName: grp.name,
        badgeLabel: grp.badgeLabel,
      });
    });

    return groups;
  }, [subjects]);

  // Filtered by search and tab
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result: Array<{
      code: SubjectGroupCode;
      info: typeof SUBJECT_GROUPS[SubjectGroupCode];
      items: Subject[];
    }> = [];

    const order: SubjectGroupCode[] = ["A", "B", "BK"];

    order.forEach((code) => {
      if (selectedGroupFilter !== "ALL" && selectedGroupFilter !== code) {
        return;
      }

      const allInGroup = groupedData[code] || [];
      const matched = q
        ? allInGroup.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.code.toLowerCase().includes(q)
          )
        : allInGroup;

      if (matched.length > 0 || !q) {
        result.push({
          code,
          info: SUBJECT_GROUPS[code],
          items: matched,
        });
      }
    });

    return result;
  }, [groupedData, searchQuery, selectedGroupFilter]);

  const countA = groupedData.A.length;
  const countB = groupedData.B.length;
  const countBK = groupedData.BK.length;
  const totalCount = subjects.length;

  const detectedGroupInForm = useMemo(() => {
    if (!formData.name && !formData.code) return null;
    return getSubjectGroup(formData.name, formData.code);
  }, [formData.name, formData.code]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800">Data Mata Pelajaran</h3>
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
              {totalCount} Mapel
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Dikelompokkan sesuai kurikulum resmi SMKS Pacet & tersinkronisasi dengan cetak raport
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={isSeedingDefaults}
            className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
            title="Isi 15 mapel default (Kelompok A 7 mapel, Kelompok B 8 mapel)"
          >
            {isSeedingDefaults ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
            Isi Mapel Default
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition shadow-sm"
          >
            <Plus size={16} />
            Tambah Mata Pelajaran
          </button>
        </div>
      </div>

      {/* Info synchronization banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-4 text-sm text-blue-900 shadow-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900">
            Sinkronisasi Struktur Kurikulum & Cetak Raport:
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Mata pelajaran di bawah ini otomatis terbagi ke dalam{" "}
            <strong>Kelompok A (Umum: 7 Mapel)</strong> dan{" "}
            <strong>Kelompok B (Kejuruan: 8 Mapel)</strong>. Penomoran dan urutan di halaman ini
            sama persis dengan yang tampil di lembar raport dan rekap nilai DKN.
          </p>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between shadow-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className={message.type === "success" ? "text-green-600" : "text-red-600"} />
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Group Summary Badges / Quick Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedGroupFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              selectedGroupFilter === "ALL"
                ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semua Kelompok ({totalCount})
          </button>
          <button
            onClick={() => setSelectedGroupFilter("A")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              selectedGroupFilter === "A"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            }`}
          >
            A. Umum ({countA})
          </button>
          <button
            onClick={() => setSelectedGroupFilter("B")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              selectedGroupFilter === "B"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            B. Kejuruan ({countB})
          </button>
          {countBK > 0 && (
            <button
              onClick={() => setSelectedGroupFilter("BK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                selectedGroupFilter === "BK"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              }`}
            >
              Layanan BK ({countBK})
            </button>
          )}
        </div>

        {/* In-page Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode atau nama mapel..."
            className="w-full pl-9 pr-8 py-2 bg-white rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Grouped Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-gray-500 shadow-sm">
          <Loader2 size={28} className="animate-spin inline-block mb-3 text-primary-600" />
          <p className="text-sm font-medium">Memuat data mata pelajaran...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-gray-500 shadow-sm">
          <Layers size={36} className="mx-auto mb-3 text-gray-400" />
          <p className="text-base font-semibold text-gray-800">
            {searchQuery ? "Mata pelajaran tidak ditemukan" : "Belum ada data mata pelajaran"}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? `Tidak ada mata pelajaran yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain.`
              : 'Klik tombol "Isi Mapel Default" untuk memuat struktur mapel resmi secara otomatis, atau tambahkan secara manual.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => {
            const isGroupA = group.code === "A";
            const isGroupB = group.code === "B";
            const isGroupBK = group.code === "BK";

            const headerBg = isGroupA
              ? "bg-gradient-to-r from-blue-700 to-indigo-800 text-white"
              : isGroupB
              ? "bg-gradient-to-r from-emerald-700 to-teal-800 text-white"
              : "bg-gradient-to-r from-amber-700 to-orange-800 text-white";

            const badgeBg = isGroupA
              ? "bg-blue-100 text-blue-800"
              : isGroupB
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800";

            return (
              <div
                key={group.code}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Group Header Banner */}
                <div className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${headerBg}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-xs font-extrabold uppercase tracking-wide backdrop-blur-sm">
                      {group.code}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold tracking-wide uppercase">
                        {group.info.name}
                      </h4>
                      <p className="text-[11px] text-white/80 font-normal">
                        {group.info.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      {group.items.length} Mata Pelajaran
                    </span>
                  </div>
                </div>

                {/* Group Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="w-14 px-4 py-3 text-center text-xs font-bold uppercase text-slate-600">
                          No
                        </th>
                        <th className="w-24 px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Kode
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Nama Mata Pelajaran
                        </th>
                        <th className="w-44 px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">
                          Kelompok
                        </th>
                        <th className="w-40 px-4 py-3 text-center text-xs font-bold uppercase text-slate-600">
                          Status Raport
                        </th>
                        <th className="w-32 px-4 py-3 text-right text-xs font-bold uppercase text-slate-600">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                            Tidak ada mata pelajaran di kelompok ini yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        group.items.map((subject, idx) => (
                          <tr
                            key={subject.id}
                            className="transition hover:bg-slate-50/80 group"
                          >
                            <td className="px-4 py-3 text-center text-xs font-semibold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 text-left">
                              <span className="inline-block rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-800 border border-slate-200">
                                {subject.code}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-left">
                              <span className="font-semibold text-slate-900 text-sm">
                                {subject.name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-left">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${badgeBg}`}
                              >
                                {isGroupA && "Kelompok A (Umum)"}
                                {isGroupB && "Kelompok B (Kejuruan)"}
                                {isGroupBK && "Layanan BK"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isGroupBK ? (
                                <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                                  Layanan Khusus
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                  <CheckCircle2 size={12} className="text-emerald-600" />
                                  Muncul di Raport
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                                <button
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                                  title="Lihat Detail"
                                  onClick={() => setDetailSubject(subject)}
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition"
                                  title="Edit"
                                  onClick={() => handleEditSubject(subject)}
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                                  title="Hapus"
                                  onClick={() => handleDeleteSubject(subject.id, subject.name)}
                                >
                                  <Trash2 size={15} />
                                </button>
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
          })}
        </div>
      )}

      {/* Modal Detail Mata Pelajaran */}
      {detailSubject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-primary-300" />
                <h4 className="font-bold text-sm tracking-wide">Detail Mata Pelajaran</h4>
              </div>
              <button
                onClick={() => setDetailSubject(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Nama Mata Pelajaran</label>
                <p className="text-base font-bold text-slate-900 mt-0.5">{detailSubject.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Kode Mapel</label>
                  <p className="font-mono text-sm font-bold text-slate-800 mt-0.5">{detailSubject.code}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Kelompok Raport</label>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {getSubjectGroup(detailSubject.name, detailSubject.code).name}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">Status Integrasi Sistem:</p>
                {getSubjectGroup(detailSubject.name, detailSubject.code).code === "BK" ? (
                  <p>Mata pelajaran ini tercatat sebagai layanan konseling siswa dan tidak dicantumkan pada nilai raport intrakurikuler.</p>
                ) : (
                  <p>Mata pelajaran ini aktif digunakan pada penginputan nilai harian (UH, Tugas, STS, SAS) dan dicetak resmi pada raport siswa.</p>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setDetailSubject(null)}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Tambah / Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="text-base font-bold tracking-wide">
                {isEditing ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Kode Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm uppercase outline-none"
                  placeholder="Contoh: MTK"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm outline-none"
                  placeholder="Contoh: Matematika"
                />
              </div>

              {/* Dynamic Group Detector Preview */}
              {detectedGroupInForm && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-indigo-800 uppercase tracking-wider text-[10px]">
                      Kategori Terdeteksi Otomatis:
                    </span>
                    <span className="rounded bg-indigo-200/80 px-2 py-0.5 font-bold text-indigo-900 text-[11px]">
                      {detectedGroupInForm.badgeLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Mata pelajaran ini otomatis masuk ke dalam <strong>{detectedGroupInForm.name}</strong> dan tersinkronisasi di raport.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddSubject}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition disabled:opacity-60 shadow-sm"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {isEditing ? "Perbarui" : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
