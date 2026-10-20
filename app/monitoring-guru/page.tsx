"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  RefreshCw,
  Printer,
  ChevronDown,
  ChevronRight,
  Send,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Filter,
  BarChart3,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
  SemesterTerm,
} from "@/lib/grade-period";

interface AssignmentProgressItem {
  id: string;
  className: string;
  subject: string;
  classLevel: string;
  majorCode: string;
  totalStudents: number;
  tpCount: number;
  tpScore: number;
  uhCount: number;
  uhScore: number;
  tugasCount: number;
  tugasScore: number;
  stsCount: number;
  stsScore: number;
  sasCount: number;
  sasScore: number;
  sikapCount: number;
  sikapScore: number;
  progress: number;
  status: "SUDAH" | "PROSES" | "BELUM";
}

interface TeacherMonitoringItem {
  id: string;
  kodeGuru: string;
  name: string;
  nip: string;
  email: string;
  totalAssignments: number;
  completedAssignments: number;
  overallProgress: number;
  status: "SUDAH" | "PROSES" | "BELUM";
  curriculumCount: number;
  journalCount: number;
  assignments: AssignmentProgressItem[];
}

interface MonitoringResponse {
  academicYear: string;
  semester: string;
  semesterLabel: string;
  summary: {
    totalTeachers: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    schoolAverage: number;
  };
  teachers: TeacherMonitoringItem[];
  error?: string;
}

export default function MonitoringGuruPage() {
  const defaultPeriod = getDefaultGradePeriod();
  const academicYearOptions = getAcademicYearOptions();

  const [selectedAcademicYear, setSelectedAcademicYear] = useState(defaultPeriod.academicYear);
  const [selectedSemester, setSelectedSemester] = useState<SemesterTerm>(defaultPeriod.term);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUDAH" | "PROSES" | "BELUM">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");

  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        academicYear: selectedAcademicYear,
        semester: selectedSemester,
      });
      const res = await fetch(`/api/monitoring-guru?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Gagal memuat data monitoring");
      }
      const json: MonitoringResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error fetching monitoring data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAcademicYear, selectedSemester]);

  const toggleTeacherExpand = (teacherId: string) => {
    setExpandedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    setExpandedTeacherIds(new Set(data.teachers.map((t) => t.id)));
  };

  const collapseAll = () => {
    setExpandedTeacherIds(new Set());
  };

  // Kumpulan daftar kelas yang ada di seluruh penugasan untuk dropdown filter
  const classList = useMemo(() => {
    if (!data) return [];
    const classes = new Set<string>();
    data.teachers.forEach((t) => {
      t.assignments.forEach((a) => {
        if (a.className) classes.add(a.className);
      });
    });
    return Array.from(classes).sort();
  }, [data]);

  // Filter guru sesuai status, pencarian, dan kelas
  const filteredTeachers = useMemo(() => {
    if (!data) return [];
    return data.teachers.filter((teacher) => {
      // Filter Status
      if (statusFilter !== "ALL" && teacher.status !== statusFilter) {
        return false;
      }

      // Filter Pencarian
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchName = teacher.name.toLowerCase().includes(q);
        const matchNip = teacher.nip.toLowerCase().includes(q);
        const matchKode = teacher.kodeGuru.toLowerCase().includes(q);
        const matchSubject = teacher.assignments.some((a) =>
          a.subject.toLowerCase().includes(q)
        );
        if (!matchName && !matchNip && !matchKode && !matchSubject) {
          return false;
        }
      }

      // Filter Kelas
      if (selectedClassFilter !== "ALL") {
        const teachesInClass = teacher.assignments.some(
          (a) => a.className === selectedClassFilter
        );
        if (!teachesInClass) return false;
      }

      return true;
    });
  }, [data, statusFilter, searchQuery, selectedClassFilter]);

  // Generator Link WhatsApp Reminder
  const generateWaLink = (teacher: TeacherMonitoringItem) => {
    const uncompletedAssignments = teacher.assignments.filter((a) => a.progress < 100);
    const missingDetails = uncompletedAssignments
      .map((a) => `- ${a.subject} (${a.className}): progres ${a.progress}%`)
      .slice(0, 4)
      .join("\n");

    const message = `*PEMBERITAHUAN PROGRES KURIKULUM SMKS PACET*\n\nYth. Bpk/Ibu *${teacher.name}*,\n\nMengingatkan kembali pengisian administrasi nilai dan pembelajaran untuk:\n*Semester:* ${selectedSemester} ${selectedAcademicYear}\n*Progres Saat Ini:* ${teacher.overallProgress}%\n\n*Catatan Penugasan Belum Lengkap:*\n${missingDetails || "- Pengisian nilai atau TP belum tuntas"}\n\nMohon untuk segera dilengkapi melalui aplikasi: https://aplikasi-kurikulum-smks-pacet.web.app\n\nTerima kasih atas dedikasi dan kerjasamanya 🙏`;

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-2">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/20">
              Khusus Admin
            </span>
            <span className="flex items-center gap-1 text-xs text-blue-200">
              <Sparkles size={14} className="text-yellow-300" /> Real-time Progress Tracking
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Monitoring Progres Pengerjaan Guru
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-2xl">
            Pantau ketuntasan pengisian nilai (UH, Tugas, STS, SAS, Sikap), Tujuan Pembelajaran (TP),
            perangkat ajar, dan jurnal mengajar seluruh dewan guru.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-sm font-medium transition backdrop-blur-sm border border-white/20 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Muat Ulang</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-900 hover:bg-blue-50 active:bg-blue-100 rounded-xl text-sm font-bold shadow-md transition"
            title="Cetak Laporan Monitoring"
          >
            <Printer size={16} />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b-2 border-gray-800 pb-3 mb-4 text-center">
        <h2 className="text-xl font-bold uppercase tracking-wide">
          SMK SWASTA PACET - LAPORAN MONITORING PROGRES GURU
        </h2>
        <p className="text-xs text-gray-600 mt-1">
          Tahun Ajaran: {selectedAcademicYear} | Semester: {selectedSemester} | Dicetak pada:{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Filter Bar & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tahun Ajaran */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Tahun Ajaran
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {SEMESTER_OPTIONS.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Filter Kelas
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">Semua Kelas</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Cari Guru */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Cari Nama / Mapel / NIP
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Ketik nama atau mapel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab Filter Status */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <Users size={14} />
              <span>Semua Guru ({data?.summary?.totalTeachers ?? 0})</span>
            </button>

            <button
              onClick={() => setStatusFilter("SUDAH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "SUDAH"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Sudah Lengkap ({data?.summary?.completedCount ?? 0})</span>
            </button>

            <button
              onClick={() => setStatusFilter("PROSES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "PROSES"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <Clock size={14} />
              <span>Dalam Proses ({data?.summary?.inProgressCount ?? 0})</span>
            </button>

            <button
              onClick={() => setStatusFilter("BELUM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "BELUM"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800"
              }`}
            >
              <XCircle size={14} />
              <span>Belum Mulai ({data?.summary?.notStartedCount ?? 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Buka Semua Detail
            </button>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-gray-500 hover:underline font-medium"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {/* Card 1: Total Guru */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Total Guru
            </p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {data?.summary?.totalTeachers ?? 0}
            </h3>
            <p className="text-[11px] text-gray-400">Terdaftar di sistem</p>
          </div>
        </div>

        {/* Card 2: Sudah Lengkap */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Sudah Lengkap
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {data?.summary?.completedCount ?? 0}
            </h3>
            <p className="text-[11px] text-emerald-600/70">100% tuntas</p>
          </div>
        </div>

        {/* Card 3: Dalam Proses */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/60 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
              Dalam Proses
            </p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {data?.summary?.inProgressCount ?? 0}
            </h3>
            <p className="text-[11px] text-amber-600/70">Sebagian terisi</p>
          </div>
        </div>

        {/* Card 4: Belum Mengisi */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-rose-200 dark:border-rose-800/60 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase">
              Belum Mengisi
            </p>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {data?.summary?.notStartedCount ?? 0}
            </h3>
            <p className="text-[11px] text-rose-600/70">0% progres</p>
          </div>
        </div>
      </div>

      {/* School Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Rata-rata Ketuntasan Pengisian Sekolah:
            </h4>
          </div>
          <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            {data?.summary?.schoolAverage ?? 0}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 h-3.5 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
            style={{ width: `${Math.min(100, Math.max(0, data?.summary?.schoolAverage ?? 0))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
          <span>0% (Belum Ada)</span>
          <span>50% (Sedang Berjalan)</span>
          <span>100% (Selesai Sepenuhnya)</span>
        </div>
      </div>

      {/* Main List / Cards */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <RefreshCw size={36} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
            Menganalisis data pengerjaan seluruh guru...
          </p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <AlertCircle size={40} className="text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-200">
            Tidak ada guru yang cocok dengan filter
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Coba ubah filter status, kata kunci pencarian, atau filter kelas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTeachers.map((teacher, index) => {
            const isExpanded = expandedTeacherIds.has(teacher.id);

            return (
              <div
                key={teacher.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all hover:border-indigo-300 dark:hover:border-indigo-600 print:border print:border-gray-300 print:shadow-none"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleTeacherExpand(teacher.id)}
                  className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-b from-transparent to-gray-50/40 dark:to-gray-900/40"
                >
                  {/* Teacher Info */}
                  <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      className="mt-0.5 md:mt-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>

                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {index + 1}. {teacher.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono font-medium">
                          {teacher.kodeGuru}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        NIP: {teacher.nip || "-"} | {teacher.totalAssignments} Penugasan Mengajar |{" "}
                        {teacher.curriculumCount} Perangkat | {teacher.journalCount} Jurnal
                      </p>
                    </div>
                  </div>

                  {/* Progress & Status Badges */}
                  <div className="flex items-center gap-4 shrink-0 pl-8 md:pl-0">
                    {/* Progress Bar & Value */}
                    <div className="w-36 md:w-48 text-right">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-gray-500 text-[11px]">Progres:</span>
                        <span
                          className={
                            teacher.overallProgress >= 100
                              ? "text-emerald-600 dark:text-emerald-400"
                              : teacher.overallProgress > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {teacher.overallProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            teacher.overallProgress >= 100
                              ? "bg-emerald-500"
                              : teacher.overallProgress > 0
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${teacher.overallProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="w-28 text-center shrink-0">
                      {teacher.status === "SUDAH" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 size={12} /> Selesai
                        </span>
                      ) : teacher.status === "PROSES" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <Clock size={12} /> Proses
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                          <XCircle size={12} /> Belum
                        </span>
                      )}
                    </div>

                    {/* Action WA Reminder */}
                    <div className="print:hidden">
                      <a
                        href={generateWaLink(teacher)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 transition flex items-center justify-center border border-emerald-200 dark:border-emerald-800"
                        title="Kirim Pengingat WhatsApp"
                      >
                        <Send size={15} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 md:p-5 bg-gray-50/70 dark:bg-gray-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-600" />
                        Rincian Progres per Kelas & Mata Pelajaran:
                      </h5>
                      <span className="text-xs text-gray-500">
                        {teacher.completedAssignments} dari {teacher.totalAssignments} kelas tuntas
                      </span>
                    </div>

                    {teacher.assignments.length === 0 ? (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500">
                        Belum ada penugasan mengajar yang terdaftar untuk guru ini di Database Guru.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="py-2.5 px-3">Kelas & Jurusan</th>
                              <th className="py-2.5 px-3">Mata Pelajaran</th>
                              <th className="py-2.5 px-3 text-center">Jml Siswa</th>
                              <th className="py-2.5 px-3 text-center">TP</th>
                              <th className="py-2.5 px-3 text-center">UH (Harian)</th>
                              <th className="py-2.5 px-3 text-center">Tugas</th>
                              <th className="py-2.5 px-3 text-center">STS</th>
                              <th className="py-2.5 px-3 text-center">SAS</th>
                              <th className="py-2.5 px-3 text-center">Sikap</th>
                              <th className="py-2.5 px-3 text-center">Total Progres</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {teacher.assignments.map((assignment) => (
                              <tr
                                key={assignment.id}
                                className="hover:bg-gray-50/80 dark:hover:bg-gray-750"
                              >
                                <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                                  {assignment.className}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">
                                  {assignment.subject}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono">
                                  {assignment.totalStudents}
                                </td>

                                {/* TP */}
                                <td className="py-2.5 px-3 text-center">
                                  {assignment.tpCount > 0 ? (
                                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                                      ✓ {assignment.tpCount} TP
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-medium text-[11px] border border-rose-200 dark:border-rose-800">
                                      0 TP
                                    </span>
                                  )}
                                </td>

                                {/* UH */}
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded font-mono text-[11px] ${
                                      assignment.uhCount >= assignment.totalStudents &&
                                      assignment.totalStudents > 0
                                        ? "text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/60"
                                        : assignment.uhCount > 0
                                        ? "text-amber-700 font-bold bg-amber-50 dark:bg-amber-950/60"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {assignment.uhCount}/{assignment.totalStudents}
                                  </span>
                                </td>

                                {/* Tugas */}
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded font-mono text-[11px] ${
                                      assignment.tugasCount >= assignment.totalStudents &&
                                      assignment.totalStudents > 0
                                        ? "text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/60"
                                        : assignment.tugasCount > 0
                                        ? "text-amber-700 font-bold bg-amber-50 dark:bg-amber-950/60"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {assignment.tugasCount}/{assignment.totalStudents}
                                  </span>
                                </td>

                                {/* STS */}
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded font-mono text-[11px] ${
                                      assignment.stsCount >= assignment.totalStudents &&
                                      assignment.totalStudents > 0
                                        ? "text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/60"
                                        : assignment.stsCount > 0
                                        ? "text-amber-700 font-bold bg-amber-50 dark:bg-amber-950/60"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {assignment.stsCount}/{assignment.totalStudents}
                                  </span>
                                </td>

                                {/* SAS */}
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded font-mono text-[11px] ${
                                      assignment.sasCount >= assignment.totalStudents &&
                                      assignment.totalStudents > 0
                                        ? "text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/60"
                                        : assignment.sasCount > 0
                                        ? "text-amber-700 font-bold bg-amber-50 dark:bg-amber-950/60"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {assignment.sasCount}/{assignment.totalStudents}
                                  </span>
                                </td>

                                {/* Sikap */}
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded font-mono text-[11px] ${
                                      assignment.sikapCount >= assignment.totalStudents &&
                                      assignment.totalStudents > 0
                                        ? "text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/60"
                                        : assignment.sikapCount > 0
                                        ? "text-amber-700 font-bold bg-amber-50 dark:bg-amber-950/60"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {assignment.sikapCount}/{assignment.totalStudents}
                                  </span>
                                </td>

                                {/* Total Progres Bar */}
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          assignment.progress >= 100
                                            ? "bg-emerald-500"
                                            : assignment.progress > 0
                                            ? "bg-amber-500"
                                            : "bg-rose-500"
                                        }`}
                                        style={{ width: `${assignment.progress}%` }}
                                      />
                                    </div>
                                    <span className="font-bold text-[11px]">
                                      {assignment.progress}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Signature Section on Print */}
      <div className="hidden print:grid grid-cols-2 pt-8 text-center text-xs">
        <div>
          <p>Mengetahui,</p>
          <p className="font-bold">Kepala SMKS Pacet</p>
          <div className="h-20" />
          <p className="font-bold underline">Drs. H. MUKLIS, M.M.</p>
          <p>NIP. 19680512 199403 1 008</p>
        </div>
        <div>
          <p>Pacet, {new Date().toLocaleDateString("id-ID")}</p>
          <p className="font-bold">Waka Kurikulum</p>
          <div className="h-20" />
          <p className="font-bold underline">TIM KURIKULUM</p>
          <p>NIP. -</p>
        </div>
      </div>
    </div>
  );
}
