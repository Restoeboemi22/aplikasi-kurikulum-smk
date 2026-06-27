"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Eye, FileText, Filter, Loader2, Save, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAcademicYearOptions, getDefaultGradePeriod, SEMESTER_OPTIONS } from "@/lib/grade-period";

type CurriculumItem = {
  id: string;
  competency: string;
  subject: string;
  gradeLevel: string;
  semester: string;
  academicYear: string;
  cp: string;
  tp: string;
  atp: string;
  timeAllocation: number;
  status: "AKTIF" | "ARSIP";
  documentUrl?: string;
};

const GRADE_OPTIONS = ["X", "XI", "XII"];

const createDefaultForm = (defaults: { semester: string; academicYear: string }) => ({
  id: "",
  competency: "",
  subject: "",
  gradeLevel: "X",
  semester: defaults.semester,
  academicYear: defaults.academicYear,
  cp: "",
  tp: "",
  atp: "",
  timeAllocation: 2,
  status: "AKTIF",
  documentUrl: "",
});

const summarizeText = (value: string, limit = 90) =>
  value.length > limit ? `${value.slice(0, limit).trim()}...` : value;

export default function CurriculumPage() {
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const defaultPeriod = getDefaultGradePeriod();
  const [selectedSemester, setSelectedSemester] = useState(defaultPeriod.term);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [curriculums, setCurriculums] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classMajors, setClassMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null);
  const [formData, setFormData] = useState(() =>
    createDefaultForm({ semester: defaultPeriod.term, academicYear: defaultPeriod.academicYear })
  );

  const loadPageData = async () => {
    setLoading(true);
    setError("");
    try {
      const [curriculumsRes, subjectsRes, classesRes] = await Promise.all([
        fetch("/api/curriculums", { cache: "no-store" }),
        fetch("/api/subjects", { cache: "no-store" }),
        fetch("/api/class-majors", { cache: "no-store" }),
      ]);

      const [curriculumsData, subjectsData, classesData] = await Promise.all([
        curriculumsRes.json().catch(() => []),
        subjectsRes.json().catch(() => []),
        classesRes.json().catch(() => []),
      ]);

      if (!curriculumsRes.ok) {
        throw new Error(curriculumsData?.error || "Gagal memuat data kurikulum.");
      }

      setCurriculums(Array.isArray(curriculumsData) ? curriculumsData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setClassMajors(Array.isArray(classesData) ? classesData : []);
    } catch (err: any) {
      setCurriculums([]);
      setSubjects([]);
      setClassMajors([]);
      setError(err.message || "Gagal memuat data kurikulum.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const academicYearOptions = useMemo(
    () =>
      Array.from(new Set([...getAcademicYearOptions(), ...curriculums.map((item) => item.academicYear)])).sort((a, b) =>
        b.localeCompare(a, "id")
      ),
    [curriculums]
  );

  const competencyOptions = useMemo(
    () =>
      Array.from(
        new Set(
          classMajors
            .map((item: any) => String(item.majorName || item.majorCode || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "id")),
    [classMajors]
  );

  const filteredCurriculums = useMemo(
    () =>
      curriculums.filter(
        (item) => item.semester === selectedSemester && item.academicYear === selectedAcademicYear
      ),
    [curriculums, selectedAcademicYear, selectedSemester]
  );

  const resetForm = () =>
    setFormData(createDefaultForm({ semester: selectedSemester, academicYear: selectedAcademicYear }));

  const openCreateModal = () => {
    resetForm();
    setError("");
    setSuccess("");
    setModalMode("create");
  };

  const openEditModal = (item: CurriculumItem) => {
    setFormData({
      id: item.id,
      competency: item.competency,
      subject: item.subject,
      gradeLevel: item.gradeLevel,
      semester: item.semester,
      academicYear: item.academicYear,
      cp: item.cp,
      tp: item.tp,
      atp: item.atp,
      timeAllocation: item.timeAllocation,
      status: item.status,
      documentUrl: item.documentUrl || "",
    });
    setError("");
    setSuccess("");
    setModalMode("edit");
  };

  const openViewModal = (item: CurriculumItem) => {
    setFormData({
      id: item.id,
      competency: item.competency,
      subject: item.subject,
      gradeLevel: item.gradeLevel,
      semester: item.semester,
      academicYear: item.academicYear,
      cp: item.cp,
      tp: item.tp,
      atp: item.atp,
      timeAllocation: item.timeAllocation,
      status: item.status,
      documentUrl: item.documentUrl || "",
    });
    setModalMode("view");
  };

  const closeModal = () => {
    setModalMode(null);
    resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/curriculums", {
        method: modalMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan data kurikulum.");
      }

      await loadPageData();
      setSuccess(modalMode === "edit" ? "Dokumen kurikulum berhasil diperbarui." : "Dokumen kurikulum berhasil ditambahkan.");
      closeModal();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan data kurikulum.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus dokumen kurikulum ini?")) return;

    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/curriculums?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal menghapus dokumen kurikulum.");
      }

      await loadPageData();
      setSuccess("Dokumen kurikulum berhasil dihapus.");
    } catch (err: any) {
      setError(err.message || "Gagal menghapus dokumen kurikulum.");
    }
  };

  if (role !== "ADMIN") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Halaman dokumen kurikulum saat ini hanya dapat diakses oleh admin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Dokumen Kurikulum</h3>
          <p className="text-sm text-gray-500">Kelola CP, TP, ATP, dan dokumen kurikulum langsung dari database.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700"
        >
          <Plus size={18} />
          Tambah Kurikulum
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Periode Kurikulum:</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as "Ganjil" | "Genap")}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SEMESTER_OPTIONS.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Tahun Ajaran</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            Menampilkan <span className="font-semibold text-gray-800">{filteredCurriculums.length}</span> dokumen
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-10 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Memuat dokumen kurikulum...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kompetensi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Periode</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">CP Ringkas</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Alokasi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCurriculums.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{item.competency}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.subject}</td>
                    <td className="px-6 py-4 text-gray-600">{item.gradeLevel}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.semester} {item.academicYear}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{summarizeText(item.cp)}</td>
                    <td className="px-6 py-4 text-gray-600">{item.timeAllocation} JP</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          item.status === "AKTIF" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openViewModal(item)} className="rounded-lg p-2 hover:bg-gray-100" title="Lihat">
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button onClick={() => openEditModal(item)} className="rounded-lg p-2 hover:bg-blue-100" title="Edit">
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="rounded-lg p-2 hover:bg-red-100" title="Hapus">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCurriculums.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">
                      Belum ada dokumen kurikulum untuk periode {selectedSemester} {selectedAcademicYear}.
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
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {modalMode === "create" ? "Tambah Dokumen Kurikulum" : modalMode === "edit" ? "Edit Dokumen Kurikulum" : "Detail Dokumen Kurikulum"}
                </h3>
                <p className="text-sm text-gray-500">CP, TP, ATP, dan metadata kurikulum tersimpan di database.</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 hover:bg-gray-100">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Kompetensi</label>
                  <input
                    type="text"
                    list="competency-options"
                    value={formData.competency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, competency: e.target.value }))}
                    disabled={modalMode === "view"}
                    placeholder="Contoh: Teknik Komputer dan Jaringan"
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                  <datalist id="competency-options">
                    {competencyOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjects.map((subject: any) => (
                      <option key={subject.id || subject.name} value={subject.name}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Kelas</label>
                  <select
                    value={formData.gradeLevel}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gradeLevel: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Alokasi Waktu (JP)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.timeAllocation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, timeAllocation: Number(e.target.value || 0) }))
                    }
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData((prev) => ({ ...prev, semester: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    {SEMESTER_OPTIONS.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tahun Ajaran</label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData((prev) => ({ ...prev, academicYear: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">URL Dokumen</label>
                  <input
                    type="text"
                    value={formData.documentUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, documentUrl: e.target.value }))}
                    disabled={modalMode === "view"}
                    placeholder="Opsional, misalnya link Google Drive"
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Capaian Pembelajaran (CP)</label>
                  <textarea
                    rows={3}
                    value={formData.cp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cp: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Tujuan Pembelajaran (TP)</label>
                  <textarea
                    rows={3}
                    value={formData.tp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tp: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Alur Tujuan Pembelajaran (ATP)</label>
                  <textarea
                    rows={4}
                    value={formData.atp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, atp: e.target.value }))}
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, status: e.target.value as "AKTIF" | "ARSIP" }))
                    }
                    disabled={modalMode === "view"}
                    className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="ARSIP">ARSIP</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText size={16} />
                Data tersimpan ke database utama aplikasi.
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
