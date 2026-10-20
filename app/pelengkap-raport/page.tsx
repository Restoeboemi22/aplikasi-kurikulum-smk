"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Award,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
  SemesterTerm,
} from "@/lib/grade-period";

interface StudentSupplementItem {
  studentId: string;
  name: string;
  nis: string;
  nisn: string;
  gender: string;
  sakit: number;
  izin: number;
  alpha: number;
  developmentPramuka: string;
  developmentSholatDhuha: string;
  personalityAkhlak: string;
  personalityKerajinan: string;
  personalityKerapian: string;
  homeroomNote: string;
  isFinalized: boolean;
  isFilled: boolean;
}

interface CommonPengesahan {
  reportCity: string;
  reportDate: string;
  homeroomSignatureName: string;
  homeroomSignatureTitle: string;
  principalSignatureName: string;
  principalSignatureTitle: string;
  principalNip: string;
}

interface BatchResponse {
  className: string;
  academicYear: string;
  semester: string;
  totalStudents: number;
  filledCount: number;
  commonPengesahan: CommonPengesahan;
  items: StudentSupplementItem[];
  error?: string;
}

interface ClassOption {
  id: string;
  className: string;
  grade: string;
  majorCode: string;
}

const TEMPLATE_CATATAN = [
  "Tingkatkan belajar dan pertahankan keaktifan di kelas.",
  "Pertahankan prestasi yang sudah diraih dan terus kembangkan potensimu.",
  "Tingkatkan kedisiplinan dan kehadiran dalam kegiatan pembelajaran.",
  "Lebih giat belajar dan fokus dalam mengikuti materi pelajaran.",
  "Terus semangat belajar untuk meraih cita-cita yang diharapkan.",
  "Pertahankan sikap sopan santun dan tingkatkan pemahaman materi.",
];

const NILAI_OPTIONS = ["-", "Sangat Baik", "Baik", "Cukup", "Kurang"];

export default function PelengkapRaportPage() {
  const { user } = useAuth();
  const defaultPeriod = getDefaultGradePeriod();
  const academicYearOptions = getAcademicYearOptions();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    defaultPeriod.academicYear
  );
  const [selectedSemester, setSelectedSemester] = useState<SemesterTerm>(defaultPeriod.term);
  const [searchQuery, setSearchQuery] = useState("");

  const [items, setItems] = useState<StudentSupplementItem[]>([]);
  const [commonPengesahan, setCommonPengesahan] = useState<CommonPengesahan>({
    reportCity: "Mojokerto",
    reportDate: "",
    homeroomSignatureName: "",
    homeroomSignatureTitle: "Wali Kelas",
    principalSignatureName: "Moh. Junaedi Hartanto, S.Pd",
    principalSignatureTitle: "Kepala Sekolah",
    principalNip: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showPengesahanDetails, setShowPengesahanDetails] = useState(false);

  // 1. Ambil daftar kelas yang berhak diakses user (Admin = semua kelas, Wali Kelas = kelas binaan)
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/class-majors");
        if (res.ok) {
          const data: ClassOption[] = await res.json();
          let availableClasses = data;

          if (user?.role === "TEACHER") {
            const allowedNames = (user.homeroomClassNames || []).map((c) =>
              c.trim().toUpperCase()
            );
            availableClasses = data.filter((c) =>
              allowedNames.includes(c.className.trim().toUpperCase())
            );
          }

          setClasses(availableClasses);
          if (availableClasses.length > 0 && !selectedClassName) {
            setSelectedClassName(availableClasses[0].className);
          }
        }
      } catch (err) {
        console.error("Error loading class majors:", err);
      }
    }

    loadClasses();
  }, [user]);

  // 2. Ambil data siswa dan data pelengkap ketika kelas/semester/tahun ajaran berubah
  const loadData = async () => {
    if (!selectedClassName) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const params = new URLSearchParams({
        className: selectedClassName,
        academicYear: selectedAcademicYear,
        semester: selectedSemester,
      });

      const res = await fetch(`/api/report-cards/supplement/batch?${params.toString()}`);
      const data: BatchResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat data pelengkap raport.");
      }

      setItems(data.items || []);
      if (data.commonPengesahan) {
        setCommonPengesahan(data.commonPengesahan);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengambil data.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClassName, selectedAcademicYear, selectedSemester]);

  // Handler update baris siswa
  const handleItemChange = (
    index: number,
    field: keyof StudentSupplementItem,
    value: any
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  // Fitur Produktivitas 1: Set Default Nilai Sikap ("Baik") untuk semua baris yang masih "-"
  const handleSetDefaultSikap = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        developmentPramuka:
          item.developmentPramuka === "-" || !item.developmentPramuka
            ? "Baik"
            : item.developmentPramuka,
        developmentSholatDhuha:
          item.developmentSholatDhuha === "-" || !item.developmentSholatDhuha
            ? "Baik"
            : item.developmentSholatDhuha,
        personalityAkhlak:
          item.personalityAkhlak === "-" || !item.personalityAkhlak
            ? "Baik"
            : item.personalityAkhlak,
        personalityKerajinan:
          item.personalityKerajinan === "-" || !item.personalityKerajinan
            ? "Baik"
            : item.personalityKerajinan,
        personalityKerapian:
          item.personalityKerapian === "-" || !item.personalityKerapian
            ? "Baik"
            : item.personalityKerapian,
      }))
    );
    setSuccessMessage("Nilai sikap (Pramuka, Dhuha, Akhlak, dll) yang kosong berhasil diatur ke 'Baik'. Jangan lupa klik 'Simpan Semua Data'!");
  };

  const FIELD_LABELS: Record<string, string> = {
    developmentPramuka: "Pramuka",
    developmentSholatDhuha: "Sholat Dhuha",
    personalityAkhlak: "Akhlak",
    personalityKerajinan: "Kerajinan",
    personalityKerapian: "Kerapian",
  };

  // Fitur Produktivitas: Terapkan satu nilai ke seluruh kolom siswa (misal Pramuka -> Sangat Baik untuk semua siswa)
  const handleApplyColumnBulk = (field: keyof StudentSupplementItem, value: string) => {
    if (!value) return;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        [field]: value,
      }))
    );
    const label = FIELD_LABELS[field as string] || "Kolom";
    setSuccessMessage(
      `✓ Kolom ${label} untuk seluruh siswa (${items.length} siswa) berhasil diatur ke '${value}'. Jangan lupa klik 'Simpan Semua Siswa'!`
    );
  };

  // Fitur Produktivitas 2: Terapkan template catatan ke semua siswa yang catatannya masih kosong
  const handleApplyTemplateToEmpty = () => {
    if (!selectedTemplate) return;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        homeroomNote:
          !item.homeroomNote || item.homeroomNote.trim() === ""
            ? selectedTemplate
            : item.homeroomNote,
      }))
    );
    setSuccessMessage("Template catatan berhasil diterapkan ke siswa yang belum memiliki catatan. Klik 'Simpan Semua Data' untuk menyimpan!");
  };

  // Simpan massal ke server
  const handleSaveAll = async () => {
    if (!selectedClassName) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/report-cards/supplement/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClassName,
          academicYear: selectedAcademicYear,
          semester: selectedSemester,
          commonPengesahan,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan data massal.");
      }

      setSuccessMessage(
        `Alhamdulillah, data pelengkap & absensi untuk ${items.length} siswa kelas ${selectedClassName} berhasil disimpan!`
      );
      // Reload preview
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  // Filter pencarian siswa
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const filledCount = useMemo(() => {
    return items.filter(
      (i) =>
        i.sakit > 0 ||
        i.izin > 0 ||
        i.alpha > 0 ||
        (i.developmentPramuka && i.developmentPramuka !== "-") ||
        (i.personalityAkhlak && i.personalityAkhlak !== "-") ||
        (i.homeroomNote && i.homeroomNote.trim() !== "")
    ).length;
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/20">
              Khusus Wali Kelas & Admin
            </span>
            <span className="flex items-center gap-1 text-xs text-teal-200">
              <Sparkles size={14} className="text-yellow-300" /> Pengisian Massal Satu Kelas
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Catatan & Absensi Wali Kelas (Pelengkap Raport)
          </h1>
          <p className="text-teal-100 text-sm mt-1 max-w-2xl">
            Input absensi (Sakit, Izin, Alpha), nilai ekstrakurikuler, kepribadian, dan catatan wali
            kelas untuk seluruh siswa dalam satu tampilan tabel praktis.
          </p>
        </div>

        {/* Action Button Save Sticky */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-sm font-medium transition backdrop-blur-sm border border-white/20 disabled:opacity-50"
            title="Muat Ulang"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving || loading || items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 rounded-xl text-sm font-black shadow-lg transition disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw size={18} className="animate-spin text-emerald-700" />
            ) : (
              <Save size={18} className="text-emerald-700" />
            )}
            <span>Simpan Semua Siswa ({items.length})</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter & Controls Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pilih Kelas */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Kelas Binaan
            </label>
            <select
              value={selectedClassName}
              onChange={(e) => setSelectedClassName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {classes.length === 0 && <option value="">Tidak ada kelas binaan</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.className}>
                  {c.className} ({c.majorCode})
                </option>
              ))}
            </select>
          </div>

          {/* Tahun Ajaran */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Tahun Ajaran
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as SemesterTerm)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {SEMESTER_OPTIONS.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Pencarian Siswa */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Cari Siswa
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Tools Bar */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Helpers */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSetDefaultSikap}
              className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold transition border border-teal-200 dark:border-teal-800 flex items-center gap-1.5"
              title="Isi otomatis kolom sikap yang masih kosong dengan nilai 'Baik'"
            >
              <Award size={14} />
              <span>Isi Default Sikap ('Baik')</span>
            </button>

            {/* Template Catatan Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium max-w-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Pilih Template Catatan --</option>
                {TEMPLATE_CATATAN.map((t, idx) => (
                  <option key={idx} value={t}>
                    {t.slice(0, 38)}...
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyTemplateToEmpty}
                disabled={!selectedTemplate}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-xs font-bold transition border border-indigo-200 dark:border-indigo-800 disabled:opacity-40"
                title="Terapkan template ke siswa yang catatannya masih kosong"
              >
                Terapkan Catatan
              </button>
            </div>
          </div>

          {/* Summary Indicator */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 size={13} /> {filledCount} dari {items.length} siswa sudah terisi
            </span>
            <button
              type="button"
              onClick={() => setShowPengesahanDetails(!showPengesahanDetails)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              {showPengesahanDetails ? "Tutup Pengesahan" : "Edit Pengesahan Raport"}
            </button>
          </div>
        </div>

        {/* Collapsible Pengesahan Raport Details */}
        {showPengesahanDetails && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Pengesahan Raport (Otomatis Berlaku untuk Seluruh Siswa di Kelas Ini)
              </h5>
              <span className="text-[11px] text-gray-400">Cukup isi sekali</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Kota</label>
                <input
                  type="text"
                  value={commonPengesahan.reportCity}
                  onChange={(e) =>
                    setCommonPengesahan((prev) => ({ ...prev, reportCity: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Tanggal Raport</label>
                <input
                  type="text"
                  placeholder="24 Oktober 2026"
                  value={commonPengesahan.reportDate}
                  onChange={(e) =>
                    setCommonPengesahan((prev) => ({ ...prev, reportDate: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Nama Wali Kelas</label>
                <input
                  type="text"
                  value={commonPengesahan.homeroomSignatureName}
                  onChange={(e) =>
                    setCommonPengesahan((prev) => ({ ...prev, homeroomSignatureName: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={commonPengesahan.principalSignatureName}
                  onChange={(e) =>
                    setCommonPengesahan((prev) => ({ ...prev, principalSignatureName: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Spreadsheet Table */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <RefreshCw size={36} className="animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
            Memuat seluruh data siswa kelas {selectedClassName}...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <AlertCircle size={40} className="text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-200">
            Tidak ada siswa ditemukan di kelas ini
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Pastikan kelas telah memiliki data siswa yang terdaftar di Data Siswa.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700 select-none">
                <tr>
                  <th className="py-3 px-3 text-center w-12 border-r border-gray-200 dark:border-gray-700">No</th>
                  <th className="py-3 px-3 min-w-[200px] border-r border-gray-200 dark:border-gray-700">
                    Nama Siswa & NIS
                  </th>
                  {/* Absensi */}
                  <th className="py-2 px-2 text-center bg-blue-50/70 dark:bg-blue-950/40 border-r border-gray-200 dark:border-gray-700" colSpan={3}>
                    <span className="block text-[11px] font-extrabold text-blue-900 dark:text-blue-300">
                      Absensi
                    </span>
                    <div className="grid grid-cols-3 text-[10px] text-blue-700 dark:text-blue-400 mt-0.5">
                      <span>S</span>
                      <span>I</span>
                      <span>A</span>
                    </div>
                  </th>
                  {/* Pengembangan Diri */}
                  <th className="py-2.5 px-2 text-center bg-teal-50/70 dark:bg-teal-950/40 border-r border-gray-200 dark:border-gray-700" colSpan={2}>
                    <span className="block text-[11px] font-extrabold text-teal-900 dark:text-teal-300">
                      Pengembangan Diri
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-teal-800 dark:text-teal-300 font-bold mb-0.5">Pramuka</span>
                        <select
                          onChange={(e) => {
                            handleApplyColumnBulk("developmentPramuka", e.target.value);
                            e.target.value = "";
                          }}
                          defaultValue=""
                          className="w-full text-[10px] py-1 px-1 bg-white dark:bg-gray-800 border border-teal-300 dark:border-teal-700 rounded text-teal-900 dark:text-teal-200 font-semibold focus:outline-none cursor-pointer shadow-2xs"
                          title="Pilih untuk menerapkan nilai Pramuka ke semua siswa"
                        >
                          <option value="" disabled>Set Semua...</option>
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang">Kurang</option>
                          <option value="-">- (Reset)</option>
                        </select>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-teal-800 dark:text-teal-300 font-bold mb-0.5">Sholat Dhuha</span>
                        <select
                          onChange={(e) => {
                            handleApplyColumnBulk("developmentSholatDhuha", e.target.value);
                            e.target.value = "";
                          }}
                          defaultValue=""
                          className="w-full text-[10px] py-1 px-1 bg-white dark:bg-gray-800 border border-teal-300 dark:border-teal-700 rounded text-teal-900 dark:text-teal-200 font-semibold focus:outline-none cursor-pointer shadow-2xs"
                          title="Pilih untuk menerapkan nilai Sholat Dhuha ke semua siswa"
                        >
                          <option value="" disabled>Set Semua...</option>
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang">Kurang</option>
                          <option value="-">- (Reset)</option>
                        </select>
                      </div>
                    </div>
                  </th>

                  {/* Kepribadian */}
                  <th className="py-2.5 px-2 text-center bg-purple-50/70 dark:bg-purple-950/40 border-r border-gray-200 dark:border-gray-700" colSpan={3}>
                    <span className="block text-[11px] font-extrabold text-purple-900 dark:text-purple-300">
                      Kepribadian
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold mb-0.5">Akhlak</span>
                        <select
                          onChange={(e) => {
                            handleApplyColumnBulk("personalityAkhlak", e.target.value);
                            e.target.value = "";
                          }}
                          defaultValue=""
                          className="w-full text-[10px] py-1 px-0.5 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded text-purple-900 dark:text-purple-200 font-semibold focus:outline-none cursor-pointer shadow-2xs"
                          title="Pilih untuk menerapkan nilai Akhlak ke semua siswa"
                        >
                          <option value="" disabled>Set Semua...</option>
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang">Kurang</option>
                          <option value="-">- (Reset)</option>
                        </select>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold mb-0.5">Kerajinan</span>
                        <select
                          onChange={(e) => {
                            handleApplyColumnBulk("personalityKerajinan", e.target.value);
                            e.target.value = "";
                          }}
                          defaultValue=""
                          className="w-full text-[10px] py-1 px-0.5 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded text-purple-900 dark:text-purple-200 font-semibold focus:outline-none cursor-pointer shadow-2xs"
                          title="Pilih untuk menerapkan nilai Kerajinan ke semua siswa"
                        >
                          <option value="" disabled>Set Semua...</option>
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang">Kurang</option>
                          <option value="-">- (Reset)</option>
                        </select>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold mb-0.5">Kerapian</span>
                        <select
                          onChange={(e) => {
                            handleApplyColumnBulk("personalityKerapian", e.target.value);
                            e.target.value = "";
                          }}
                          defaultValue=""
                          className="w-full text-[10px] py-1 px-0.5 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded text-purple-900 dark:text-purple-200 font-semibold focus:outline-none cursor-pointer shadow-2xs"
                          title="Pilih untuk menerapkan nilai Kerapian ke semua siswa"
                        >
                          <option value="" disabled>Set Semua...</option>
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                          <option value="Kurang">Kurang</option>
                          <option value="-">- (Reset)</option>
                        </select>
                      </div>
                    </div>
                  </th>
                  {/* Catatan Wali Kelas */}
                  <th className="py-3 px-3 min-w-[300px]">
                    Catatan Wali Kelas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredItems.map((student, index) => {
                  const actualIndex = items.findIndex((i) => i.studentId === student.studentId);

                  return (
                    <tr
                      key={student.studentId}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-750 transition"
                    >
                      {/* No */}
                      <td className="py-2 px-3 text-center font-mono text-gray-500 border-r border-gray-200 dark:border-gray-700">
                        {index + 1}
                      </td>

                      {/* Nama Siswa */}
                      <td className="py-2 px-3 border-r border-gray-200 dark:border-gray-700">
                        <div className="font-bold text-gray-900 dark:text-white leading-tight">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                          NIS: {student.nis} | {student.gender === "L" ? "Laki-laki" : student.gender === "P" ? "Perempuan" : student.gender}
                        </div>
                      </td>

                      {/* Absensi: Sakit */}
                      <td className="py-1 px-1 text-center bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="number"
                          min="0"
                          value={student.sakit}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "sakit", e.target.value)
                          }
                          className="w-12 text-center py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Absensi: Izin */}
                      <td className="py-1 px-1 text-center bg-blue-50/20 dark:bg-blue-950/10">
                        <input
                          type="number"
                          min="0"
                          value={student.izin}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "izin", e.target.value)
                          }
                          className="w-12 text-center py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Absensi: Alpha */}
                      <td className="py-1 px-1 text-center bg-blue-50/20 dark:bg-blue-950/10 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="number"
                          min="0"
                          value={student.alpha}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "alpha", e.target.value)
                          }
                          className="w-12 text-center py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Ekskul: Pramuka */}
                      <td className="py-1 px-1.5 bg-teal-50/20 dark:bg-teal-950/10">
                        <select
                          value={student.developmentPramuka}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "developmentPramuka", e.target.value)
                          }
                          className="w-24 py-1 px-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-[11px] font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        >
                          {NILAI_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Ekskul: Sholat Dhuha */}
                      <td className="py-1 px-1.5 bg-teal-50/20 dark:bg-teal-950/10 border-r border-gray-200 dark:border-gray-700">
                        <select
                          value={student.developmentSholatDhuha}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "developmentSholatDhuha", e.target.value)
                          }
                          className="w-24 py-1 px-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-[11px] font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        >
                          {NILAI_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Kepribadian: Akhlak */}
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <select
                          value={student.personalityAkhlak}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "personalityAkhlak", e.target.value)
                          }
                          className="w-20 py-1 px-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-[11px] font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {NILAI_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Kepribadian: Kerajinan */}
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10">
                        <select
                          value={student.personalityKerajinan}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "personalityKerajinan", e.target.value)
                          }
                          className="w-20 py-1 px-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-[11px] font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {NILAI_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Kepribadian: Kerapian */}
                      <td className="py-1 px-1 bg-purple-50/20 dark:bg-purple-950/10 border-r border-gray-200 dark:border-gray-700">
                        <select
                          value={student.personalityKerapian}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "personalityKerapian", e.target.value)
                          }
                          className="w-20 py-1 px-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-[11px] font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          {NILAI_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Catatan Wali Kelas */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          placeholder="Ketik catatan motivasi..."
                          value={student.homeroomNote}
                          onChange={(e) =>
                            handleItemChange(actualIndex, "homeroomNote", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Save Bar */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {filteredItems.length} siswa kelas {selectedClassName}. Data tersimpan otomatis sinkron ke halaman Cetak Raport.
            </span>

            <button
              onClick={handleSaveAll}
              disabled={saving || loading || items.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-extrabold shadow-md transition disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              <span>Simpan Semua Data Kelas Ini ({items.length} Siswa)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
