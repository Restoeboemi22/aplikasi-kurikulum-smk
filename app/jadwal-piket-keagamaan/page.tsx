"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Edit, Filter, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getDateFromScheduleFilter } from "@/lib/class-picket";
import { CurrentTeacher, resolveCurrentTeacher } from "@/lib/current-teacher";
import {
  getMonitoringSummaryForReligiousPicket,
  getReligiousPicketDayName,
  getReligiousPicketMonthName,
  getReligiousPicketWeekLabel,
  RELIGIOUS_PICKET_DAYS,
  RELIGIOUS_PICKET_MONTHS,
  RELIGIOUS_PICKET_WEEKS,
  ReligiousPicketReport,
  ReligiousPicketSchedule,
  toDateInputValue,
} from "@/lib/religious-picket";

const years = Array.from({ length: 18 }, (_, i) => (2023 + i).toString());

const matchesTeacherIdentity = (
  schedule: ReligiousPicketSchedule,
  teacher: CurrentTeacher | null
) => {
  if (!teacher) return false;
  return (
    (schedule.teacherId && schedule.teacherId === teacher.id) ||
    (schedule.teacherUserId && schedule.teacherUserId === teacher.userId) ||
    (schedule.teacherNip && teacher.nip && schedule.teacherNip === teacher.nip) ||
    (schedule.teacherKodeGuru && schedule.teacherKodeGuru === teacher.kodeGuru) ||
    schedule.teacherName.trim().toLowerCase() === teacher.name.trim().toLowerCase()
  );
};

function TeacherReligiousPicketPage({
  currentTeacher,
  schedules,
}: {
  currentTeacher: CurrentTeacher | null;
  schedules: ReligiousPicketSchedule[];
}) {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [reports, setReports] = useState<ReligiousPicketReport[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; notes: string }>>({});
  const [savingScheduleId, setSavingScheduleId] = useState("");
  const [error, setError] = useState("");

  const selectedDateObject = useMemo(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [selectedDate]);

  const targetMonth = getReligiousPicketMonthName(selectedDateObject);
  const targetWeek = getReligiousPicketWeekLabel(selectedDateObject);
  const targetDay = getReligiousPicketDayName(selectedDateObject);
  const targetYear = String(selectedDateObject.getFullYear());

  const teacherSchedules = useMemo(
    () => schedules.filter((schedule) => matchesTeacherIdentity(schedule, currentTeacher)),
    [currentTeacher, schedules]
  );

  const exactSchedules = useMemo(
    () =>
      teacherSchedules.filter(
        (schedule) =>
          schedule.year === targetYear &&
          schedule.month === targetMonth &&
          schedule.week === targetWeek &&
          schedule.day === targetDay
      ),
    [teacherSchedules, targetDay, targetMonth, targetWeek, targetYear]
  );

  const fallbackSchedules = useMemo(
    () =>
      teacherSchedules
        .filter((schedule) => schedule.month === targetMonth && schedule.week === targetWeek && schedule.day === targetDay)
        .sort((a, b) => Number(b.year) - Number(a.year)),
    [teacherSchedules, targetDay, targetMonth, targetWeek]
  );

  const matchedSchedules = exactSchedules.length > 0 ? exactSchedules : fallbackSchedules;
  const matchedScheduleIds = matchedSchedules.map((schedule) => schedule.id);

  useEffect(() => {
    if (matchedScheduleIds.length === 0) {
      setReports([]);
      setDrafts({});
      return;
    }

    let cancelled = false;
    const loadReports = async () => {
      try {
        const response = await fetch(
          `/api/religious-picket-reports?reportDate=${selectedDate}&scheduleIds=${matchedScheduleIds.join(",")}`,
          { cache: "no-store" }
        );
        const result = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(result?.error || "Gagal mengambil laporan piket keagamaan.");
        }
        if (!cancelled) {
          const nextReports = Array.isArray(result) ? result : [];
          setReports(nextReports);
          setDrafts(
            Object.fromEntries(
              matchedSchedules.map((schedule) => {
                const report = nextReports.find((item: ReligiousPicketReport) => item.scheduleId === schedule.id);
                return [schedule.id, { status: report?.status || "Belum", notes: report?.notes || "" }];
              })
            )
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Gagal mengambil laporan piket keagamaan.");
          setReports([]);
          setDrafts({});
        }
      }
    };

    loadReports();
    return () => {
      cancelled = true;
    };
  }, [matchedScheduleIds.join(","), matchedSchedules, selectedDate]);

  const handleSave = async (scheduleId: string) => {
    const draft = drafts[scheduleId];
    if (!draft) return;

    setSavingScheduleId(scheduleId);
    setError("");
    try {
      const response = await fetch("/api/religious-picket-reports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduleId,
          reportDate: selectedDate,
          status: draft.status,
          notes: draft.notes,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan laporan piket keagamaan.");
      }

      const nextReport = result?.report;
      if (nextReport) {
        setReports((prev) => {
          const filtered = prev.filter((item) => item.scheduleId !== scheduleId);
          return [nextReport, ...filtered];
        });
      }
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan laporan piket keagamaan.");
    } finally {
      setSavingScheduleId("");
    }
  };

  if (!currentTeacher) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Profil guru aktif belum ditemukan. Pastikan akun login Anda sudah terhubung ke `Data Guru`.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Piket Keagamaan</h3>
          <p className="text-sm text-gray-500">Check-in pelaksanaan piket keagamaan sesuai jadwal admin.</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Guru Bertugas</p>
          <p className="mt-1 text-xl font-semibold text-gray-800">{currentTeacher.name}</p>
          <p className="mt-1 text-sm text-gray-500">Kode Guru {currentTeacher.kodeGuru}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Jadwal Hari Ini</p>
          <p className="mt-1 text-3xl font-bold text-gray-800">{matchedSchedules.length}</p>
          <p className="mt-1 text-sm text-gray-500">Sesuai tanggal terpilih</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Status Terakhir</p>
          <p className="mt-1 text-sm font-medium text-green-700">
            {reports.some((item) => item.status === "Sudah") ? "Sudah check-in" : "Belum check-in"}
          </p>
        </div>
      </div>

      {matchedSchedules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <Clock size={40} className="mx-auto text-gray-300" />
          <h4 className="mt-4 text-lg font-semibold text-gray-700">Belum ada jadwal piket untuk tanggal ini</h4>
          <p className="mt-2 text-sm text-gray-500">
            Coba ubah tanggal atau pastikan admin sudah membuat jadwal piket keagamaan untuk Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchedSchedules.map((schedule) => {
            const report = reports.find((item) => item.scheduleId === schedule.id);
            const draft = drafts[schedule.id] || { status: report?.status || "Belum", notes: report?.notes || "" };
            return (
              <div key={schedule.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-gray-800">
                      {schedule.day}, {schedule.week} {schedule.month} {schedule.year}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Status tersimpan: {report?.status || "Belum"} | Check-in: {report?.checkInTime || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <Save size={16} />
                    {savingScheduleId === schedule.id ? "Menyimpan..." : "Simpan ke server"}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status Kehadiran</label>
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [schedule.id]: { ...(prev[schedule.id] || draft), status: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Belum">Belum</option>
                      <option value="Sudah">Sudah</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Catatan</label>
                    <textarea
                      value={draft.notes}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [schedule.id]: { ...(prev[schedule.id] || draft), notes: e.target.value },
                        }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Tuliskan catatan bila ada."
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSave(schedule.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                  >
                    <Save size={16} />
                    Simpan Laporan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReligiousPickupPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<"monitoring" | "create">("monitoring");
  const [selectedDay, setSelectedDay] = useState<string>(() => getReligiousPicketDayName(new Date()) || "Selasa");
  const [selectedWeek, setSelectedWeek] = useState<string>(() => getReligiousPicketWeekLabel(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getReligiousPicketMonthName(new Date()) || "Juni");
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<CurrentTeacher | null>(null);
  const [createdSchedules, setCreatedSchedules] = useState<ReligiousPicketSchedule[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [monitoringReports, setMonitoringReports] = useState<ReligiousPicketReport[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSchedules = async () => {
    const response = await fetch("/api/religious-picket-schedules", { cache: "no-store" });
    const result = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(result?.error || "Gagal memuat jadwal piket keagamaan.");
    }
    setCreatedSchedules(Array.isArray(result) ? result : []);
  };

  useEffect(() => {
    let cancelled = false;

    const loadTeachers = async () => {
      try {
        const response = await fetch("/api/teachers", { cache: "no-store" });
        const result = await response.json().catch(() => []);
        if (!cancelled) {
          setTeachers(Array.isArray(result) ? result : []);
        }
      } catch {
        if (!cancelled) {
          setTeachers([]);
        }
      }
    };

    loadTeachers();
    loadSchedules().catch(() => {
      if (!cancelled) setCreatedSchedules([]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (isAdmin) {
      setCurrentTeacher(null);
      return;
    }

    resolveCurrentTeacher(user)
      .then((teacher) => {
        if (!cancelled) setCurrentTeacher(teacher);
      })
      .catch(() => {
        if (!cancelled) setCurrentTeacher(null);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user]);

  const filteredMonitoringSchedules = useMemo(
    () =>
      createdSchedules.filter(
        (item) =>
          item.year === selectedYear &&
          item.month === selectedMonth &&
          item.week === selectedWeek &&
          item.day === selectedDay
      ),
    [createdSchedules, selectedDay, selectedMonth, selectedWeek, selectedYear]
  );

  const monitoringDate = useMemo(
    () =>
      getDateFromScheduleFilter({
        year: selectedYear,
        month: selectedMonth,
        week: selectedWeek,
        day: selectedDay,
      }),
    [selectedDay, selectedMonth, selectedWeek, selectedYear]
  );
  const monitoringDateValue = monitoringDate ? toDateInputValue(monitoringDate) : "";

  useEffect(() => {
    if (!isAdmin || filteredMonitoringSchedules.length === 0 || !monitoringDateValue) {
      setMonitoringReports([]);
      return;
    }

    let cancelled = false;
    const loadReports = async () => {
      try {
        const response = await fetch(
          `/api/religious-picket-reports?reportDate=${monitoringDateValue}&scheduleIds=${filteredMonitoringSchedules
            .map((item) => item.id)
            .join(",")}`,
          { cache: "no-store" }
        );
        const result = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(result?.error || "Gagal mengambil monitoring piket keagamaan.");
        }
        if (!cancelled) {
          setMonitoringReports(Array.isArray(result) ? result : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Gagal mengambil monitoring piket keagamaan.");
          setMonitoringReports([]);
        }
      }
    };

    loadReports();
    return () => {
      cancelled = true;
    };
  }, [filteredMonitoringSchedules, isAdmin, monitoringDateValue]);

  const monitoringRows = useMemo(
    () =>
      filteredMonitoringSchedules.map((item) => ({
        item,
        summary: getMonitoringSummaryForReligiousPicket(
          monitoringReports.filter((report) => report.scheduleId === item.id)
        ),
      })),
    [filteredMonitoringSchedules, monitoringReports]
  );

  const handleSaveSchedule = async () => {
    setError("");
    setSuccess("");
    if (!selectedTeacherId) {
      setError("Guru/pembimbing wajib dipilih.");
      return;
    }

    try {
      const response = await fetch("/api/religious-picket-schedules", {
        method: editingScheduleId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingScheduleId,
          teacherId: selectedTeacherId,
          day: selectedDay,
          week: selectedWeek,
          month: selectedMonth,
          year: selectedYear,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan jadwal piket keagamaan.");
      }

      await loadSchedules();
      setSelectedTeacherId("");
      setEditingScheduleId(null);
      setSuccess(editingScheduleId ? "Jadwal piket keagamaan berhasil diperbarui." : "Jadwal piket keagamaan berhasil dibuat.");
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan jadwal piket keagamaan.");
    }
  };

  const handleEditSchedule = (item: ReligiousPicketSchedule) => {
    setEditingScheduleId(item.id);
    setSelectedTeacherId(item.teacherId);
    setSelectedDay(item.day);
    setSelectedWeek(item.week);
    setSelectedMonth(item.month);
    setSelectedYear(item.year);
    setActiveTab("create");
  };

  const handleDeleteSchedule = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/religious-picket-schedules?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menghapus jadwal piket keagamaan.");
      }
      await loadSchedules();
      setSuccess("Jadwal piket keagamaan berhasil dihapus.");
    } catch (err: any) {
      setError(err.message || "Gagal menghapus jadwal piket keagamaan.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Sudah":
        return "bg-green-100 text-green-700";
      case "Belum":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Sudah":
        return <CheckCircle2 size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  if (!isAdmin) {
    return <TeacherReligiousPicketPage currentTeacher={currentTeacher} schedules={createdSchedules} />;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`${
              activeTab === "monitoring"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
          >
            Monitoring Piket Keagamaan
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`${
              activeTab === "create"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
          >
            Buat Jadwal Piket Keagamaan
          </button>
        </nav>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {activeTab === "monitoring" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Monitoring Piket Keagamaan</h3>
            <p className="text-sm text-gray-500">Monitor kehadiran dan catatan guru piket keagamaan.</p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {RELIGIOUS_PICKET_MONTHS.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {RELIGIOUS_PICKET_WEEKS.map((week) => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </select>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {RELIGIOUS_PICKET_DAYS.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h4 className="text-sm text-gray-500">Total Guru Piket</h4>
              <p className="mt-1 text-3xl font-bold text-gray-800">{monitoringRows.length}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h4 className="text-sm text-green-600">Sudah Piket</h4>
              <p className="mt-1 text-3xl font-bold text-green-700">
                {monitoringRows.filter((row) => row.summary.status === "Sudah").length}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h4 className="text-sm text-red-600">Belum Piket</h4>
              <p className="mt-1 text-3xl font-bold text-red-700">
                {monitoringRows.filter((row) => row.summary.status !== "Sudah").length}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru/Pembimbing</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Waktu Check In</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Catatan</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monitoringRows.map(({ item, summary }) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{item.day}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.teacherName}</td>
                    <td className="px-6 py-4 text-gray-600">{summary.checkInTime}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(summary.status)}`}>
                        {getStatusIcon(summary.status)}
                        {summary.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{summary.notes}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditSchedule(item)} className="rounded-lg p-2 hover:bg-blue-100" title="Edit">
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button onClick={() => handleDeleteSchedule(item.id)} className="rounded-lg p-2 hover:bg-red-100" title="Hapus">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Buat Jadwal Piket Keagamaan</h3>
            <p className="text-sm text-gray-500">Atur jadwal piket keagamaan untuk setiap guru.</p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-md font-semibold text-gray-800">
              {editingScheduleId ? "Ubah Jadwal Piket" : "Tambah Jadwal Piket"}
            </h4>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {RELIGIOUS_PICKET_MONTHS.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {RELIGIOUS_PICKET_WEEKS.map((week) => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </select>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                {RELIGIOUS_PICKET_DAYS.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Pilih Guru</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))}
              </select>
            </div>

            <button onClick={handleSaveSchedule} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700">
              <Plus size={18} />
              {editingScheduleId ? "Simpan Perubahan" : "Tambah Jadwal"}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tahun</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Bulan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Minggu</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru/Pembimbing</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {createdSchedules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{item.year}</td>
                    <td className="px-6 py-4 text-gray-600">{item.month}</td>
                    <td className="px-6 py-4 text-gray-600">{item.week}</td>
                    <td className="px-6 py-4 text-gray-600">{item.day}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.teacherName}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditSchedule(item)} className="rounded-lg p-2 hover:bg-blue-100" title="Edit">
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button onClick={() => handleDeleteSchedule(item.id)} className="rounded-lg p-2 hover:bg-red-100" title="Hapus">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
