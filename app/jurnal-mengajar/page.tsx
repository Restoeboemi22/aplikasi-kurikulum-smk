"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, CheckCircle2, Clock, Printer, Save, Trash2, Filter, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccessTab, defaultTabFor } from "@/lib/permissions";
import {
  getAcademicYearOptions,
  getDefaultGradePeriod,
  SEMESTER_OPTIONS,
} from "@/lib/grade-period";
import {
  getTeacherClassOptions,
  getTeacherSubjectOptions,
  type CurrentTeacher,
} from "@/lib/current-teacher";

const PAGE_ID = "jurnal-mengajar";

type Journal = {
  id: string;
  teacherId: string;
  teacher: string;
  subject: string;
  class: string;
  semester: string;
  academicYear: string;
  date: string;
  jamKe: string;
  material: string;
  presentCount: string;
  absentCount: string;
  issues: string;
  status: string;
  createdAt: number;
};

type TeacherOption = CurrentTeacher;

type Student = {
  id: string;
  name: string;
  nis: string;
  className: string | null;
};

type AttendanceStatus = "Hadir" | "Sakit" | "Izin" | "Alpa";

const defaultPeriod = getDefaultGradePeriod();

const EMPTY_FORM = {
  teacherId: "",
  teacher: "",
  subject: "",
  class: "",
  semester: defaultPeriod.term,
  academicYear: defaultPeriod.academicYear,
  date: "",
  jamKe: [] as string[],
  material: "",
  presentCount: "",
  absentCount: "",
  issues: "",
};

function createEmptyForm(teacher?: TeacherOption | null) {
  return {
    ...EMPTY_FORM,
    teacherId: teacher?.id ?? "",
    teacher: teacher?.name ?? "",
  };
}

function formatDate(value: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Minggu ke- dalam bulan (1-6), dihitung dari tanggal.
function weekOfMonth(d: Date) {
  return Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
}

export default function TeachingJournalPage() {
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const [activeTab, setActiveTab] = useState(() =>
    defaultTabFor(role, PAGE_ID, "jurnal")
  );
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // Filter laporan (Monitoring)
  const [filterWeek, setFilterWeek] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSemester, setFilterSemester] = useState(defaultPeriod.term);
  const [filterAcademicYear, setFilterAcademicYear] = useState(defaultPeriod.academicYear);
  const [filterTeacher, setFilterTeacher] = useState("");

  const [journals, setJournals] = useState<Journal[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentAttendance, setStudentAttendance] = useState<Record<string, AttendanceStatus>>({});

  const academicYearOptions = getAcademicYearOptions();
  const currentTeacher = useMemo(
    () => teacherOptions.find((teacher) => teacher.userId === user?.uid) ?? null,
    [teacherOptions, user?.uid]
  );

  // Daftar nama guru dari database admin.
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const response = await fetch("/api/teachers");
        if (!response.ok) return;
        const teachers = await response.json();
        const normalizedTeachers = teachers
          .map((teacher: CurrentTeacher) => ({
            id: teacher.id,
            userId: teacher.userId,
            name: teacher.name?.trim() || "",
            mataPelajaran: teacher.mataPelajaran || "",
            tingkatKelas: teacher.tingkatKelas || [],
            jurusan: teacher.jurusan || [],
            teachingAssignments: teacher.teachingAssignments || [],
          }))
          .filter((teacher: TeacherOption) => Boolean(teacher.name));
        setTeacherOptions(normalizedTeachers);
      } catch {
        /* abaikan — dropdown nama guru sekadar tidak terisi bila gagal */
      }
    };

    loadTeachers();
  }, []);

  // Guru: isi otomatis Nama Guru dengan namanya sendiri di form.
  useEffect(() => {
    if (role !== "TEACHER") {
      return;
    }

    setFormData((previous) => {
      const teacherName = currentTeacher?.name ?? user?.name ?? "";
      const teacherId = currentTeacher?.id ?? "";

      if (previous.teacherId === teacherId && previous.teacher === teacherName) {
        return previous;
      }

      return {
        ...previous,
        teacherId,
        teacher: teacherName,
      };
    });
  }, [currentTeacher, role, user?.name]);

  useEffect(() => {
    if (!formData.class) {
      setStudents([]);
      setStudentAttendance({});
      return;
    }

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const response = await fetch(`/api/students?className=${encodeURIComponent(formData.class)}`);
        if (response.ok) {
          const data: Student[] = await response.json();
          setStudents(data);
          
          const initialAttendance: Record<string, AttendanceStatus> = {};
          data.forEach(s => {
            initialAttendance[s.id] = "Hadir";
          });
          setStudentAttendance(initialAttendance);
          
          setFormData(prev => ({
            ...prev,
            presentCount: String(data.length),
            absentCount: "0"
          }));
        }
      } catch (err) {
        console.error("Failed to load students", err);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [formData.class]);

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance(prev => {
      const next = { ...prev, [studentId]: status };
      let present = 0;
      let absent = 0;
      Object.values(next).forEach(s => {
        if (s === "Hadir") present++;
        else absent++;
      });
      setFormData(f => ({ ...f, presentCount: String(present), absentCount: String(absent) }));
      return next;
    });
  };

  useEffect(() => {
    const loadJournals = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          semester: filterSemester,
          academicYear: filterAcademicYear,
        });
        const response = await fetch(`/api/journals?${params.toString()}`, { cache: "no-store" });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || "Gagal memuat jurnal.");
        }
        setJournals(result);
      } catch (error: any) {
        setError(error.message || "Gagal memuat jurnal. Periksa koneksi atau izin akses.");
      } finally {
        setLoading(false);
      }
    };

    loadJournals();
  }, [filterSemester, filterAcademicYear]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    let finalIssues = formData.issues;
    const absents = students.filter(s => studentAttendance[s.id] !== "Hadir");
    if (absents.length > 0) {
      const absentText = "Siswa Tidak Hadir: " + absents.map(s => `${s.name} (${studentAttendance[s.id]})`).join(", ");
      finalIssues = finalIssues ? `${finalIssues}\n\n${absentText}` : absentText;
    }

    try {
      const response = await fetch("/api/journals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId: formData.teacherId,
          subject: formData.subject,
          className: formData.class,
          semester: formData.semester,
          academicYear: formData.academicYear,
          date: formData.date,
          jamKe: formData.jamKe,
          material: formData.material,
          presentCount: formData.presentCount,
          absentCount: formData.absentCount,
          issues: finalIssues,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan jurnal.");
      }

      setJournals((prev) => [result, ...prev]);
      setFormData(createEmptyForm(role === "TEACHER" ? currentTeacher : null));
      setActiveTab("jurnal");
    } catch (error: any) {
      setError(error.message || "Gagal menyimpan jurnal. Periksa koneksi internet.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus jurnal ini?")) return;
    try {
      const response = await fetch(`/api/journals?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menghapus jurnal.");
      }
      setJournals((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      setError(error.message || "Gagal menghapus jurnal.");
    }
  };

  // Daftar tahun untuk dropdown laporan: 2026–2030.
  const availableYears = [2026, 2027, 2028, 2029, 2030];

  // Daftar nama guru dari Database > Data Guru (terintegrasi, realtime).
  const availableTeachers = useMemo(
    () => Array.from(new Set(teacherOptions.map((teacher) => teacher.name))),
    [teacherOptions]
  );

  // Pilihan Nama Guru di form:
  // - ADMIN: semua guru terdaftar.
  // - GURU: hanya dirinya sendiri (sesuai data di database admin).
  const formTeacherOptions = useMemo(
    () =>
      role === "ADMIN"
        ? teacherOptions
        : teacherOptions.filter((teacher) => teacher.userId === user?.uid),
    [role, teacherOptions, user?.uid]
  );

  const selectedTeacherName =
    formData.teacher ||
    formTeacherOptions.find((teacher) => teacher.id === formData.teacherId)?.name ||
    currentTeacher?.name ||
    user?.name ||
    "";

  const selectedTeacherProfile = useMemo(
    () => formTeacherOptions.find((teacher) => teacher.id === formData.teacherId) ?? currentTeacher ?? null,
    [currentTeacher, formData.teacherId, formTeacherOptions]
  );
  const subjectOptions = useMemo(
    () => getTeacherSubjectOptions(selectedTeacherProfile),
    [selectedTeacherProfile]
  );
  const classOptions = useMemo(
    () => getTeacherClassOptions(selectedTeacherProfile, formData.subject).map((assignment) => assignment.className),
    [selectedTeacherProfile, formData.subject]
  );

  useEffect(() => {
    if (!selectedTeacherProfile) return;

    setFormData((previous) => {
      const nextSubject = subjectOptions.includes(previous.subject) ? previous.subject : subjectOptions[0] || "";
      const nextClass = classOptions.includes(previous.class) ? previous.class : classOptions[0] || "";

      if (previous.subject === nextSubject && previous.class === nextClass) {
        return previous;
      }

      return {
        ...previous,
        subject: nextSubject,
        class: nextClass,
      };
    });
  }, [classOptions, selectedTeacherProfile, subjectOptions]);

  // Terapkan filter minggu/bulan/tahun ke data jurnal.
  const filteredJournals = journals.filter((j) => {
    const teacherMatch = !filterTeacher || j.teacher === filterTeacher;
    const semesterMatch = !filterSemester || (j.semester || defaultPeriod.term) === filterSemester;
    const academicYearMatch =
      !filterAcademicYear || (j.academicYear || defaultPeriod.academicYear) === filterAcademicYear;
    const d = new Date(j.date);
    if (isNaN(d.getTime())) {
      // Tanpa tanggal valid: hanya tampil bila tidak ada filter tanggal aktif.
      return teacherMatch && semesterMatch && academicYearMatch && !filterWeek && !filterMonth && !filterYear;
    }
    const yearMatch = !filterYear || d.getFullYear() === Number(filterYear);
    const monthMatch = !filterMonth || d.getMonth() === Number(filterMonth);
    const weekMatch = !filterWeek || weekOfMonth(d) === Number(filterWeek);
    return teacherMatch && semesterMatch && academicYearMatch && yearMatch && monthMatch && weekMatch;
  });

  const resetFilter = () => {
    setFilterWeek("");
    setFilterMonth("");
    setFilterYear("");
    setFilterSemester(defaultPeriod.term);
    setFilterAcademicYear(defaultPeriod.academicYear);
    setFilterTeacher("");
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {canAccessTab(role, PAGE_ID, "jurnal") && (
            <button
              onClick={() => setActiveTab("jurnal")}
              className={`${
                activeTab === "jurnal"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Monitoring Jurnal Mengajar
            </button>
          )}
          {canAccessTab(role, PAGE_ID, "format") && (
            <button
              onClick={() => setActiveTab("format")}
              className={`${
                activeTab === "format"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Format Jurnal Mengajar
            </button>
          )}
        </nav>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Content: Monitoring */}
      {activeTab === "jurnal" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Monitoring Jurnal Mengajar</h3>
              <p className="text-sm text-gray-500">Rekap kegiatan belajar mengajar harian</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                <Printer size={18} />
                Cetak Laporan
              </button>
              <button onClick={() => setActiveTab("format")} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                <Plus size={18} />
                Tambah Jurnal
              </button>
            </div>
          </div>

          {/* Filter Laporan */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Laporan:</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Semester</label>
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value as "Ganjil" | "Genap")}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {SEMESTER_OPTIONS.map((semester) => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Tahun Ajaran</label>
                <select
                  value={filterAcademicYear}
                  onChange={(e) => setFilterAcademicYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {academicYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Minggu ke-</label>
                <select
                  value={filterWeek}
                  onChange={(e) => setFilterWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Semua Minggu</option>
                  {[1, 2, 3, 4, 5, 6].map((w) => (
                    <option key={w} value={w}>Minggu ke-{w}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Bulan</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Semua Bulan</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Tahun</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Semua Tahun</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Nama Guru</label>
                <select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Semua Guru</option>
                  {availableTeachers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {(filterWeek || filterMonth || filterYear || filterTeacher || filterSemester !== defaultPeriod.term || filterAcademicYear !== defaultPeriod.academicYear) && (
                <button
                  onClick={resetFilter}
                  className="self-end px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reset Filter
                </button>
              )}

              <div className="ml-auto self-end text-sm text-gray-500">
                Menampilkan <span className="font-semibold text-gray-800">{filteredJournals.length}</span> jurnal
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Periode</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jam ke-</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Materi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hadir</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tidak Hadir</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Catatan / Kendala</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-400 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Memuat jurnal...
                      </span>
                    </td>
                  </tr>
                )}
                {!loading && filteredJournals.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-400 text-sm">
                      {journals.length === 0
                        ? "Belum ada jurnal. Isi lewat tab \"Format Jurnal Mengajar\"."
                        : "Tidak ada jurnal untuk filter laporan yang dipilih."}
                    </td>
                  </tr>
                )}
                {!loading && filteredJournals.map((item) => {
                  const jamList = item.jamKe ? item.jamKe.split(",").map(j => j.trim()).filter(Boolean) : [];
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-6 py-4 font-medium text-gray-800 whitespace-nowrap">{item.teacher}</td>
                      <td className="px-6 py-4 text-gray-600">{item.subject || "-"}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{item.semester || defaultPeriod.term} {item.academicYear || defaultPeriod.academicYear}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{item.class}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {jamList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {jamList.map((jam) => (
                              <span key={jam} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                Jam ke-{jam}
                              </span>
                            ))}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.material}</td>
                      <td className="px-6 py-4 text-gray-600">{item.presentCount || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{item.absentCount || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{item.issues || "-"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.status === "SUDAH"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {item.status === "SUDAH" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Format */}
      {activeTab === "format" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Format Jurnal Mengajar</h3>
              <p className="text-sm text-gray-500">Isi jurnal mengajar — data tersimpan dan tampil di Monitoring</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Template Jurnal Mengajar</h4>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Nama Guru</label>
                  {role === "ADMIN" ? (
                    <select
                      required
                      value={formData.teacherId}
                      onChange={(e) => {
                        const selectedTeacher = formTeacherOptions.find(
                          (teacher) => teacher.id === e.target.value
                        );
                        setFormData((previous) => ({
                          ...previous,
                          teacherId: e.target.value,
                          teacher: selectedTeacher?.name ?? "",
                          subject: "",
                          class: "",
                        }));
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Pilih guru</option>
                      {formTeacherOptions.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedTeacherName}
                      readOnly
                      className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      placeholder="Nama guru mengikuti akun login"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                    disabled={subjectOptions.length === 0}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    <option value="">Pilih mata pelajaran</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Kelas</label>
                  <select
                    required
                    value={formData.class}
                    onChange={(e) => setFormData((p) => ({ ...p, class: e.target.value }))}
                    disabled={classOptions.length === 0}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  >
                    <option value="">Pilih kelas</option>
                    {classOptions.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Semester</label>
                  <select
                    required
                    value={formData.semester}
                    onChange={(e) => setFormData((p) => ({ ...p, semester: e.target.value as "Ganjil" | "Genap" }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {SEMESTER_OPTIONS.map((semester) => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tahun Ajaran</label>
                  <select
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData((p) => ({ ...p, academicYear: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Jam ke-</label>
                <div className="grid grid-cols-4 gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((jam) => (
                    <label key={jam} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.jamKe.includes(String(jam))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((p) => {
                              return { ...p, jamKe: [...p.jamKe, String(jam)] };
                            });
                          } else {
                            setFormData((p) => {
                              return { ...p, jamKe: p.jamKe.filter(j => j !== String(jam)) };
                            });
                          }
                        }}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Jam ke-{jam}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Materi Pembelajaran</label>
                <textarea
                  required
                  value={formData.material}
                  onChange={(e) => setFormData((p) => ({ ...p, material: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Masukkan materi pembelajaran"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah Siswa Hadir</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.presentCount}
                    onChange={(e) => setFormData((p) => ({ ...p, presentCount: e.target.value }))}
                    className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${students.length > 0 ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                    placeholder="0"
                    readOnly={students.length > 0}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah Siswa Tidak Hadir</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.absentCount}
                    onChange={(e) => setFormData((p) => ({ ...p, absentCount: e.target.value }))}
                    className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${students.length > 0 ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                    placeholder="0"
                    readOnly={students.length > 0}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Catatan / Kendala</label>
                <textarea
                  value={formData.issues}
                  onChange={(e) => setFormData((p) => ({ ...p, issues: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Masukkan catatan atau kendala"
                />
              </div>

              {students.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    Daftar Siswa untuk Presensi
                    {loadingStudents && <Loader2 size={14} className="animate-spin text-primary-600" />}
                  </label>
                  <div className="border border-gray-300 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                          <th className="px-4 py-3 font-semibold">No</th>
                          <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                          <th className="px-4 py-3 font-semibold text-center">Hadir</th>
                          <th className="px-4 py-3 font-semibold text-center">Sakit</th>
                          <th className="px-4 py-3 font-semibold text-center">Izin</th>
                          <th className="px-4 py-3 font-semibold text-center">Alpa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {students.map((student, idx) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium text-gray-800">{student.name}</td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={studentAttendance[student.id] === "Hadir"}
                                onChange={() => handleAttendanceChange(student.id, "Hadir")}
                                className="w-4 h-4 text-primary-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={studentAttendance[student.id] === "Sakit"}
                                onChange={() => handleAttendanceChange(student.id, "Sakit")}
                                className="w-4 h-4 text-yellow-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={studentAttendance[student.id] === "Izin"}
                                onChange={() => handleAttendanceChange(student.id, "Izin")}
                                className="w-4 h-4 text-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="radio"
                                name={`attendance-${student.id}`}
                                checked={studentAttendance[student.id] === "Alpa"}
                                onChange={() => handleAttendanceChange(student.id, "Alpa")}
                                className="w-4 h-4 text-red-600 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setFormData(createEmptyForm(role === "TEACHER" ? currentTeacher : null))}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? "Menyimpan..." : "Simpan Jurnal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
