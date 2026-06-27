"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getTeacherClassOptions,
  getTeacherSubjectOptions,
  resolveCurrentTeacher,
  type CurrentTeacher,
} from "@/lib/current-teacher";

type SemesterTerm = "Ganjil" | "Genap";

type TeacherOption = CurrentTeacher;

type ObjectiveItem = {
  id: string;
  objectiveText: string;
  orderNo: number;
};

type AdminObjectiveItem = ObjectiveItem & {
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  academicYear: string;
  semester: SemesterTerm;
  updatedAt: string;
};

const getDefaultAcademicYear = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
};

const buildAcademicYearOptions = () => {
  const current = getDefaultAcademicYear();
  const [startYear] = current.split("/").map(Number);
  return [`${startYear - 1}/${startYear}`, current, `${startYear + 1}/${startYear + 2}`];
};

function summarizeTeachingObjectives(objectives: string[]) {
  const items = Array.from(
    new Set(
      objectives
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

  if (items.length === 0) return "...";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;

  const compactItems = items.slice(0, 3);
  if (items.length > 3) {
    return `${compactItems[0]}, ${compactItems[1]}, serta ${compactItems[2]} dan tujuan pembelajaran terkait lainnya`;
  }

  return `${compactItems[0]}, ${compactItems[1]}, serta ${compactItems[2]}`;
}

function buildCpPreview(level: string, objectives: string[]) {
  return `Ananda ${level} dalam ${summarizeTeachingObjectives(objectives)}.`;
}

export default function TeachingObjectivesPage() {
  const { user } = useAuth();
  const academicYearOptions = useMemo(buildAcademicYearOptions, []);
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [teacherProfile, setTeacherProfile] = useState<TeacherOption | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [savedObjectives, setSavedObjectives] = useState<ObjectiveItem[]>([]);
  const [monitorObjectives, setMonitorObjectives] = useState<AdminObjectiveItem[]>([]);
  const [formData, setFormData] = useState({
    academicYear: getDefaultAcademicYear(),
    semester: "Ganjil" as SemesterTerm,
    className: "",
    subject: "",
    objectiveText: "",
  });

  const isAdmin = user?.role === "ADMIN";
  const activeTeacher = useMemo(() => {
    if (isAdmin) {
      return teacherOptions.find((teacher) => teacher.id === selectedTeacherId) ?? null;
    }

    return teacherProfile;
  }, [isAdmin, selectedTeacherId, teacherOptions, teacherProfile]);

  const subjectOptions = useMemo(
    () => getTeacherSubjectOptions(activeTeacher),
    [activeTeacher]
  );
  const classOptions = useMemo(
    () => getTeacherClassOptions(activeTeacher, formData.subject).map((assignment) => assignment.className),
    [activeTeacher, formData.subject]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setLoadingContext(true);
      setError("");

      try {
        if (user?.role === "ADMIN") {
          const response = await fetch("/api/teachers", { cache: "no-store" });
          const result = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(result?.error || "Gagal memuat daftar guru.");
          }

          const teachers = (result || []) as TeacherOption[];
          if (!cancelled) {
            setTeacherOptions(teachers);
            setSelectedTeacherId((previous) => previous || teachers[0]?.id || "");
          }
        } else if (user?.role === "TEACHER") {
          const currentTeacher = await resolveCurrentTeacher(user);
          if (!cancelled) {
            setTeacherProfile(currentTeacher);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Gagal memuat konteks TP.");
        }
      } finally {
        if (!cancelled) {
          setLoadingContext(false);
        }
      }
    }

    if (user) {
      loadContext();
    } else {
      setLoadingContext(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!activeTeacher) return;

    setFormData((previous) => {
      const nextClass = classOptions.includes(previous.className) ? previous.className : classOptions[0] || "";
      const nextSubject = subjectOptions.includes(previous.subject) ? previous.subject : subjectOptions[0] || "";

      if (nextClass === previous.className && nextSubject === previous.subject) {
        return previous;
      }

      return {
        ...previous,
        className: nextClass,
        subject: nextSubject,
      };
    });
  }, [activeTeacher, classOptions, subjectOptions]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!user || !formData.academicYear || !formData.semester) return;

      if (!isAdmin && (!formData.className || !formData.subject)) {
        setSavedObjectives([]);
        return;
      }

      if (isAdmin && !selectedTeacherId) {
        setMonitorObjectives([]);
        return;
      }

      setLoadingData(true);
      setError("");
      setMessage("");

      try {
        const params = new URLSearchParams({
          academicYear: formData.academicYear,
          semester: formData.semester,
        });

        if (formData.className) params.set("className", formData.className);
        if (formData.subject) params.set("subject", formData.subject);
        if (isAdmin && selectedTeacherId) params.set("teacherId", selectedTeacherId);

        const response = await fetch(`/api/teaching-objectives?${params.toString()}`, {
          cache: "no-store",
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Gagal memuat tujuan pembelajaran.");
        }

        if (cancelled) return;

        if (isAdmin) {
          const objectives = (result?.objectives || []) as AdminObjectiveItem[];
          setMonitorObjectives(objectives);
        } else {
          const objectives = (result?.objectives || []) as ObjectiveItem[];
          setSavedObjectives(objectives);
          setFormData((previous) => ({
            ...previous,
            objectiveText: objectives.map((item) => item.objectiveText).join("\n"),
          }));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal memuat tujuan pembelajaran."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    formData.academicYear,
    formData.className,
    formData.semester,
    formData.subject,
    isAdmin,
    selectedTeacherId,
    user,
  ]);

  const objectiveLines = useMemo(
    () =>
      formData.objectiveText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [formData.objectiveText]
  );

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/teaching-objectives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYear: formData.academicYear,
          semester: formData.semester,
          className: formData.className,
          subject: formData.subject,
          objectives: objectiveLines,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan TP.");
      }

      setSavedObjectives((result?.objectives || []) as ObjectiveItem[]);
      setMessage(result?.message || "TP berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan TP.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams({
        academicYear: formData.academicYear,
        semester: formData.semester,
        className: formData.className,
        subject: formData.subject,
      });

      const response = await fetch(`/api/teaching-objectives?${params.toString()}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal menghapus TP.");
      }

      setSavedObjectives([]);
      setFormData((previous) => ({ ...previous, objectiveText: "" }));
      setMessage(result?.message || "TP berhasil dihapus.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Gagal menghapus TP.");
    } finally {
      setResetting(false);
    }
  };

  if (loadingContext) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">TP (Tujuan Pembelajaran)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Guru menginput TP per mapel dan kelas. Raport akan otomatis membentuk
              deskripsi Capaian Pembelajaran berdasarkan nilai akhir siswa dan TP yang
              sudah tersimpan.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">Monitor TP Guru</h3>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Guru</span>
                <select
                  value={selectedTeacherId}
                  onChange={(event) => setSelectedTeacherId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Tahun Ajaran</span>
                  <select
                    value={formData.academicYear}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        academicYear: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {academicYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Semester</span>
                  <select
                    value={formData.semester}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        semester: event.target.value as SemesterTerm,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Kelas</span>
                <select
                  value={formData.className}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, className: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Mata Pelajaran</span>
                <select
                  value={formData.subject}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, subject: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Hasil Monitor TP</h3>
              </div>
              {loadingData ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat...
                </div>
              ) : null}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="border px-3 py-2">No</th>
                    <th className="border px-3 py-2">Guru</th>
                    <th className="border px-3 py-2">Kelas</th>
                    <th className="border px-3 py-2">Mapel</th>
                    <th className="border px-3 py-2">TP</th>
                    <th className="border px-3 py-2">Urutan</th>
                  </tr>
                </thead>
                <tbody>
                  {monitorObjectives.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="border px-3 py-8 text-center text-slate-500"
                      >
                        Belum ada TP untuk filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    monitorObjectives.map((item, index) => (
                      <tr key={item.id} className="align-top">
                        <td className="border px-3 py-2">{index + 1}</td>
                        <td className="border px-3 py-2 font-medium text-slate-900">
                          {item.teacherName}
                        </td>
                        <td className="border px-3 py-2">{item.className}</td>
                        <td className="border px-3 py-2">{item.subject}</td>
                        <td className="border px-3 py-2">{item.objectiveText}</td>
                        <td className="border px-3 py-2 text-center">{item.orderNo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Input TP Guru</h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Tahun Ajaran</span>
                <select
                  value={formData.academicYear}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      academicYear: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {academicYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Semester</span>
                <select
                  value={formData.semester}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      semester: event.target.value as SemesterTerm,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Kelas</span>
                <select
                  value={formData.className}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, className: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Mata Pelajaran</span>
                <select
                  value={formData.subject}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, subject: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-700">Daftar TP</span>
                {loadingData ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat TP tersimpan...
                  </div>
                ) : null}
              </div>
              <textarea
                value={formData.objectiveText}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    objectiveText: event.target.value,
                  }))
                }
                rows={12}
                placeholder={
                  "Memahami konsep dasar jaringan komputer\nMenerapkan konfigurasi IP address\nMenganalisis topologi jaringan sederhana"
                }
                className="w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm outline-none focus:border-blue-500"
              />
              <p className="text-xs text-slate-500">Satu baris mewakili satu TP.</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formData.className || !formData.subject}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan TP
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={resetting || (!formData.className && !formData.subject)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Hapus / Reset TP
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData((previous) => ({
                    ...previous,
                    objectiveText: savedObjectives.map((item) => item.objectiveText).join("\n"),
                  }))
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Muat Ulang TP
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Ringkasan Multi-TP</h3>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {summarizeTeachingObjectives(objectiveLines)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Preview CP di Raport</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">93 - 100</p>
                  <p className="mt-1">{buildCpPreview("sangat baik", objectiveLines)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">85 - 92</p>
                  <p className="mt-1">{buildCpPreview("baik", objectiveLines)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">78 - 84</p>
                  <p className="mt-1">{buildCpPreview("cukup", objectiveLines)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">&lt; 78</p>
                  <p className="mt-1">{buildCpPreview("kurang", objectiveLines)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
