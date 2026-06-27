"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Edit,
  Eye,
  Filter,
  Minus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { CurrentTeacher, resolveCurrentTeacher } from "@/lib/current-teacher";
import {
  AdminMonitoringStatus,
  CLASS_PICKET_DAYS,
  CLASS_PICKET_MONTHS,
  CLASS_PICKET_PERIODS,
  ClassPicketPeriod,
  ClassPicketReportItem,
  ClassPicketSchedule,
  ClassPicketStatus,
  TeacherReportState,
  buildTeacherReportStateFromReports,
  formatPicketReportDate,
  flattenTeacherReportState,
  getClassPicketDayName,
  getDateFromScheduleFilter,
  getClassPicketMonthName,
  getClassPicketWeekLabel,
  getMonitoringSummaryForSchedule,
  isGraduatedClass,
  matchesTeacherScheduleIdentity,
  toDateInputValue,
} from "@/lib/class-picket";

const WEEK_OPTIONS = ["Minggu ke-I", "Minggu ke-II", "Minggu ke-III", "Minggu ke-IV", "Minggu ke-V"];

const getNextStatus = (status: ClassPicketStatus): ClassPicketStatus => {
  if (status === "empty") return "done";
  if (status === "done") return "issue";
  return "empty";
};

const formatMonitoringTime = (timestamp?: number) => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StatusToggleCell({
  status,
  onClick,
  readOnly = false,
}: {
  status: ClassPicketStatus;
  onClick?: () => void;
  readOnly?: boolean;
}) {
  const baseClass =
    "mx-auto flex h-9 w-9 items-center justify-center rounded-md border-2 transition";
  const interactiveClass = readOnly ? "cursor-default" : "hover:scale-[1.04]";

  if (status === "done") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={readOnly}
        className={`${baseClass} ${interactiveClass} border-slate-900 bg-white text-slate-900`}
        title="Sudah dipantau"
      >
        <Check size={24} strokeWidth={3} />
      </button>
    );
  }

  if (status === "issue") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={readOnly}
        className={`${baseClass} ${interactiveClass} border-slate-900 bg-[repeating-linear-gradient(45deg,#111827,#111827_2px,#f8fafc_2px,#f8fafc_4px)] text-transparent`}
        title="Ada catatan/masalah"
      >
        <Minus size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={readOnly}
      className={`${baseClass} ${interactiveClass} border-slate-400 bg-white text-slate-300`}
      title="Belum ditandai"
    >
      <Minus size={18} />
    </button>
  );
}

function PicketReportSheet({
  reportDate,
  classRows,
  reportState,
  onToggle,
  readOnly = false,
}: {
  reportDate: Date;
  classRows: string[];
  reportState: TeacherReportState;
  onToggle?: (className: string, period: ClassPicketPeriod) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#7f71b8] bg-white shadow-sm">
      <div className="border-b border-[#7f71b8] bg-[#f3efff] px-6 py-5 text-center">
        <p className="text-2xl font-black uppercase tracking-wide text-gray-900">Laporan Piket</p>
        <p className="mt-1 text-3xl font-black uppercase text-gray-900">{formatPicketReportDate(reportDate)}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[#b8aadf] text-gray-900">
              <th rowSpan={2} className="border border-[#5d5387] px-4 py-3 text-center text-2xl font-bold">
                NO
              </th>
              <th rowSpan={2} className="border border-[#5d5387] px-6 py-3 text-center text-2xl font-bold">
                KELAS
              </th>
              <th
                colSpan={CLASS_PICKET_PERIODS.length}
                className="border border-[#5d5387] px-6 py-3 text-center text-2xl font-bold"
              >
                JAM KE-
              </th>
            </tr>
            <tr className="bg-[#d8d0f0] text-gray-900">
              {CLASS_PICKET_PERIODS.map((period) => (
                <th key={period} className="border border-[#5d5387] px-5 py-3 text-center text-2xl font-bold">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classRows.map((className, index) => (
              <tr key={className}>
                <td className="border border-gray-700 px-4 py-3 text-center text-2xl font-bold">{index + 1}</td>
                <td className="border border-gray-700 px-4 py-3 text-center text-2xl font-bold">{className}</td>
                {isGraduatedClass(className) ? (
                  <td
                    colSpan={CLASS_PICKET_PERIODS.length}
                    className="border border-gray-700 px-4 py-6 text-center text-3xl font-black text-gray-900"
                  >
                    LULUS
                  </td>
                ) : (
                  CLASS_PICKET_PERIODS.map((period) => (
                    <td key={period} className="border border-gray-700 px-3 py-3 text-center">
                      <StatusToggleCell
                        status={reportState[className]?.[period] || "empty"}
                        onClick={onToggle ? () => onToggle(className, period) : undefined}
                        readOnly={readOnly}
                      />
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 border-t border-[#7f71b8] bg-[#faf8ff] px-6 py-4 text-sm text-gray-600 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-slate-900">
            <Check size={16} strokeWidth={3} />
          </div>
          <span>Sudah dipantau</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-slate-900 bg-[repeating-linear-gradient(45deg,#111827,#111827_2px,#f8fafc_2px,#f8fafc_4px)]" />
          <span>Ada catatan/masalah</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-slate-400 bg-white" />
          <span>Belum ditandai</span>
        </div>
      </div>
    </div>
  );
}

function TeacherPicketClassPage({
  currentTeacher,
  schedules,
}: {
  currentTeacher: CurrentTeacher | null;
  schedules: ClassPicketSchedule[];
}) {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [reportState, setReportState] = useState<TeacherReportState>({});
  const [reportItems, setReportItems] = useState<ClassPicketReportItem[]>([]);
  const [savedAt, setSavedAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedDateObject = useMemo(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [selectedDate]);

  const teacherScopedSchedules = useMemo(() => {
    if (!currentTeacher) return [];

    return schedules.filter(
      (schedule) =>
        matchesTeacherScheduleIdentity(schedule, {
          id: currentTeacher.id,
          userId: currentTeacher.userId,
          name: currentTeacher.name,
          nip: currentTeacher.nip,
          kodeGuru: currentTeacher.kodeGuru,
        })
    );
  }, [currentTeacher, schedules]);

  const targetMonth = getClassPicketMonthName(selectedDateObject);
  const targetWeek = getClassPicketWeekLabel(selectedDateObject);
  const targetDay = getClassPicketDayName(selectedDateObject);
  const targetYear = String(selectedDateObject.getFullYear());

  const exactMatchedSchedules = useMemo(
    () =>
      teacherScopedSchedules.filter(
        (schedule) =>
          schedule.year === targetYear &&
          schedule.month === targetMonth &&
          schedule.week === targetWeek &&
          schedule.day === targetDay
      ),
    [teacherScopedSchedules, targetYear, targetMonth, targetWeek, targetDay]
  );

  const fallbackMatchedSchedules = useMemo(
    () =>
      teacherScopedSchedules
        .filter(
          (schedule) => schedule.month === targetMonth && schedule.week === targetWeek && schedule.day === targetDay
        )
        .sort((a, b) => Number(b.year) - Number(a.year)),
    [teacherScopedSchedules, targetMonth, targetWeek, targetDay]
  );

  const matchedSchedules = exactMatchedSchedules.length > 0 ? exactMatchedSchedules : fallbackMatchedSchedules;
  const isUsingYearFallback =
    exactMatchedSchedules.length === 0 && fallbackMatchedSchedules.length > 0 && fallbackMatchedSchedules[0].year !== targetYear;
  const matchedScheduleIds = matchedSchedules.map((schedule) => String(schedule.id));

  const classRows = useMemo(() => {
    const classMap = new Map<string, string>();
    matchedSchedules.forEach((schedule) => {
      schedule.classes.forEach((className) => {
        if (!classMap.has(className)) {
          classMap.set(className, className);
        }
      });
    });
    return Array.from(classMap.values());
  }, [matchedSchedules]);

  useEffect(() => {
    if (!currentTeacher || matchedScheduleIds.length === 0) {
      setReportState({});
      setReportItems([]);
      return;
    }

    let cancelled = false;

    const loadReports = async () => {
      try {
        const response = await fetch(
          `/api/class-picket-reports?reportDate=${selectedDate}&scheduleIds=${matchedScheduleIds.join(",")}`,
          { cache: "no-store" }
        );
        const result = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(result?.error || "Gagal mengambil laporan piket kelas.");
        }
        if (!cancelled) {
          const nextReports = Array.isArray(result) ? result : [];
          setReportItems(nextReports);
          setReportState(buildTeacherReportStateFromReports(classRows, nextReports));
        }
      } catch {
        if (!cancelled) {
          setReportItems([]);
          setReportState(buildTeacherReportStateFromReports(classRows, []));
        }
      }
    };

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [currentTeacher, selectedDate, classRows, matchedScheduleIds.join(",")]);

  const persistReport = async (nextState: TeacherReportState) => {
    if (!currentTeacher || matchedScheduleIds.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/class-picket-reports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportDate: selectedDate,
          scheduleIds: matchedScheduleIds,
          entries: flattenTeacherReportState(nextState, matchedSchedules, selectedDate),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan laporan piket kelas.");
      }
      const nextReports = Array.isArray(result?.reports) ? result.reports : [];
      setReportItems(nextReports);
      setReportState(buildTeacherReportStateFromReports(classRows, nextReports));
      setSavedAt(
        new Date(result?.savedAt || new Date()).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      setReportState({});
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = (className: string, period: ClassPicketPeriod) => {
    const currentStatus = reportState[className]?.[period] || "empty";
    const nextStatus = getNextStatus(currentStatus);
    const nextRow = {
      ...(reportState[className] || buildTeacherReportStateFromReports([className], [])[className]),
      [period]: nextStatus,
    };
    const nextState = {
      ...reportState,
      [className]: nextRow,
    };
    setReportState(nextState);
    persistReport(nextState);
  };

  const doneCount = classRows.reduce(
    (total, className) =>
      total +
      CLASS_PICKET_PERIODS.filter((period) => reportState[className]?.[period] === "done").length,
    0
  );
  const issueCount = classRows.reduce(
    (total, className) =>
      total +
      CLASS_PICKET_PERIODS.filter((period) => reportState[className]?.[period] === "issue").length,
    0
  );

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
          <h3 className="text-lg font-semibold text-gray-800">Piket Kelas</h3>
          <p className="text-sm text-gray-500">
            Lembar laporan piket kelas untuk guru piket sesuai jadwal dari admin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Save size={16} />
            {isSaving ? "Menyimpan..." : savedAt ? `Tersimpan otomatis ${savedAt}` : "Simpan otomatis aktif"}
          </div>
        </div>
      </div>

      {isUsingYearFallback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Jadwal tahun {targetYear} belum ada. Sistem menampilkan jadwal dengan pola hari yang sama dari tahun{" "}
          {fallbackMatchedSchedules[0]?.year}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Guru Piket</p>
          <p className="mt-1 text-xl font-semibold text-gray-800">{currentTeacher.name}</p>
          <p className="mt-1 text-sm text-gray-500">Kode Guru {currentTeacher.kodeGuru}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Kelas Ditugaskan</p>
          <p className="mt-1 text-3xl font-bold text-gray-800">{classRows.length}</p>
          <p className="mt-1 text-sm text-gray-500">Sesuai jadwal tanggal terpilih</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Rekap Tanda</p>
          <p className="mt-1 text-sm font-medium text-emerald-700">{doneCount} selesai</p>
          <p className="mt-1 text-sm font-medium text-amber-700">{issueCount} catatan</p>
        </div>
      </div>

      {matchedSchedules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <ClipboardCheck size={40} className="mx-auto text-gray-300" />
          <h4 className="mt-4 text-lg font-semibold text-gray-700">Belum ada jadwal piket untuk tanggal ini</h4>
          <p className="mt-2 text-sm text-gray-500">
            Coba ubah tanggal atau pastikan admin sudah membuat jadwal piket kelas untuk Anda.
          </p>
        </div>
      ) : (
        <PicketReportSheet
          reportDate={selectedDateObject}
          classRows={classRows}
          reportState={reportState}
          onToggle={toggleStatus}
        />
      )}
    </div>
  );
}

export default function ClassPickupPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState("monitoring");
  
  // Monitoring filters states
  const [selectedDay, setSelectedDay] = useState(() => getClassPicketDayName(new Date()) || "Senin");
  const [selectedWeek, setSelectedWeek] = useState(() => getClassPicketWeekLabel(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => getClassPicketMonthName(new Date()) || "Januari");
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  
  // Creation form states
  const [formDay, setFormDay] = useState(() => getClassPicketDayName(new Date()) || "Senin");
  const [formWeek, setFormWeek] = useState("all"); // Default to "all" (Seluruh Minggu) for easier monthly schedule
  const [formMonth, setFormMonth] = useState(() => getClassPicketMonthName(new Date()) || "Januari");
  const [formYear, setFormYear] = useState(() => String(new Date().getFullYear()));
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacherId2, setSelectedTeacherId2] = useState(""); // Second teacher state
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<CurrentTeacher | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [monitoringReports, setMonitoringReports] = useState<ClassPicketReportItem[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const years = useMemo(
    () => Array.from({ length: 18 }, (_, i) => (2023 + i).toString()),
    []
  );

  const [createdSchedules, setCreatedSchedules] = useState<ClassPicketSchedule[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadMasterData = async () => {
      try {
        const [teachersRes, classesRes] = await Promise.all([
          fetch("/api/teachers", { cache: "no-store" }),
          fetch("/api/class-majors", { cache: "no-store" }),
        ]);

        const [teachersData, classesData] = await Promise.all([
          teachersRes.json().catch(() => []),
          classesRes.json().catch(() => []),
        ]);

        if (!cancelled) {
          setTeachers(Array.isArray(teachersData) ? teachersData : []);
          setClasses(Array.isArray(classesData) ? classesData : []);
        }
      } catch {
        if (!cancelled) {
          setTeachers([]);
          setClasses([]);
        }
      }
    };

    loadMasterData();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const response = await fetch("/api/class-picket-schedules", { cache: "no-store" });
      const result = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat jadwal piket kelas.");
      }
      setCreatedSchedules(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat jadwal piket kelas.");
      setCreatedSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isAdmin) {
      setCurrentTeacher(null);
      return;
    }

    resolveCurrentTeacher(user)
      .then((teacher) => {
        if (!cancelled) {
          setCurrentTeacher(teacher);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentTeacher(null);
        }
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
      setLoadingReports(true);
      try {
        const response = await fetch(
          `/api/class-picket-reports?reportDate=${monitoringDateValue}&scheduleIds=${filteredMonitoringSchedules
            .map((item) => String(item.id))
            .join(",")}`,
          { cache: "no-store" }
        );
        const result = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(result?.error || "Gagal mengambil monitoring piket kelas.");
        }
        if (!cancelled) {
          setMonitoringReports(Array.isArray(result) ? result : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setMonitoringReports([]);
          setError(err.message || "Gagal mengambil monitoring piket kelas.");
        }
      } finally {
        if (!cancelled) {
          setLoadingReports(false);
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
        summary: getMonitoringSummaryForSchedule(item, monitoringReports),
      })),
    [filteredMonitoringSchedules, monitoringReports]
  );

  const completedMonitoringCount = monitoringRows.filter((row) => row.summary.status === "Selesai").length;
  const inProgressMonitoringCount = monitoringRows.filter((row) => row.summary.status === "Proses").length;
  const pendingMonitoringCount = monitoringRows.filter((row) => row.summary.status === "Belum").length;
  const viewingSchedule = monitoringRows.find(({ item }) => String(item.id) === viewingScheduleId);
  const viewingClassRows = viewingSchedule?.item.classes || [];
  const viewingReportState = buildTeacherReportStateFromReports(
    viewingClassRows,
    viewingSchedule
      ? monitoringReports.filter((report) => report.scheduleId === String(viewingSchedule.item.id))
      : []
  );

  const resetAdminForm = () => {
    setEditingScheduleId(null);
    setSelectedTeacherId("");
    setSelectedTeacherId2("");
    setSelectedClasses([]);
    setFormDay(getClassPicketDayName(new Date()) || "Senin");
    setFormWeek("all");
    setFormMonth(getClassPicketMonthName(new Date()) || "Januari");
    setFormYear(String(new Date().getFullYear()));
  };

  const handleSaveSchedule = async () => {
    setError("");
    setSuccess("");

    if (!selectedTeacherId || selectedClasses.length === 0) {
      setError("Guru piket 1 dan minimal satu kelas wajib dipilih.");
      return;
    }

    try {
      let bodyData: any = {};

      if (editingScheduleId) {
        bodyData = {
          id: editingScheduleId,
          teacherId: selectedTeacherId,
          day: formDay,
          week: formWeek,
          month: formMonth,
          year: formYear,
          classes: selectedClasses,
        };
      } else {
        const teacherIds = [selectedTeacherId];
        if (selectedTeacherId2) {
          teacherIds.push(selectedTeacherId2);
        }

        const weeks = formWeek === "all" ? WEEK_OPTIONS : [formWeek];

        bodyData = {
          teacherIds,
          day: formDay,
          weeks,
          month: formMonth,
          year: formYear,
          classes: selectedClasses,
        };
      }

      const response = await fetch("/api/class-picket-schedules", {
        method: editingScheduleId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menyimpan jadwal piket kelas.");
      }

      await loadSchedules();
      setSuccess(editingScheduleId ? "Jadwal piket kelas berhasil diperbarui." : "Jadwal piket kelas berhasil dibuat.");
      resetAdminForm();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan jadwal piket kelas.");
    }
  };

  const handleEditSchedule = (item: ClassPicketSchedule) => {
    setError("");
    setSuccess("");
    setEditingScheduleId(String(item.id));
    setSelectedTeacherId(item.teacherId || "");
    setSelectedTeacherId2("");
    setSelectedClasses(item.classes);
    setFormDay(item.day);
    setFormWeek(item.week);
    setFormMonth(item.month);
    setFormYear(item.year);
    setActiveTab("create");
  };

  const handleDeleteSchedule = async (id: number | string) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/class-picket-schedules?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Gagal menghapus jadwal piket kelas.");
      }
      await loadSchedules();
      if (editingScheduleId === String(id)) {
        resetAdminForm();
      }
      setSuccess("Jadwal piket kelas berhasil dihapus.");
    } catch (err: any) {
      setError(err.message || "Gagal menghapus jadwal piket kelas.");
    }
  };

  const getMonitoringStatusColor = (status: AdminMonitoringStatus) => {
    switch (status) {
      case "Selesai":
        return "bg-green-100 text-green-700";
      case "Proses":
        return "bg-amber-100 text-amber-700";
      case "Belum":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getMonitoringStatusIcon = (status: AdminMonitoringStatus) => {
    switch (status) {
      case "Selesai":
        return <CheckCircle2 size={16} />;
      case "Proses":
        return <Clock size={16} />;
      case "Belum":
        return <Clock size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  if (!isAdmin) {
    return <TeacherPicketClassPage currentTeacher={currentTeacher} schedules={createdSchedules} />;
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
            Monitoring Piket Kelas
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`${
              activeTab === "create"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
          >
            Buat Jadwal Piket Kelas
          </button>
        </nav>
      </div>

      {activeTab === "monitoring" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Monitoring Piket Kelas</h3>
            <p className="text-sm text-gray-500">
              Monitor guru piket kelas berdasarkan jadwal yang sudah dibuat admin.
            </p>
          </div>

          {(error || success) && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {error || success}
            </div>
          )}

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Tahun</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CLASS_PICKET_MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Minggu</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {WEEK_OPTIONS.map((week) => (
                    <option key={week} value={week}>
                      {week}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Hari</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CLASS_PICKET_DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h4 className="mb-1 text-sm text-gray-500">Total Guru Piket</h4>
              <p className="text-3xl font-bold text-gray-800">{monitoringRows.length}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h4 className="mb-1 text-sm text-green-600">Selesai</h4>
              <p className="text-3xl font-bold text-green-700">{completedMonitoringCount}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h4 className="mb-1 text-sm text-amber-600">Proses / Belum</h4>
              <p className="text-3xl font-bold text-amber-700">{inProgressMonitoringCount + pendingMonitoringCount}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru Piket</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Kelas Yang Ditanggung
                  </th>
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
                    <td className="px-6 py-4 text-gray-600">{item.classes.join(", ")}</td>
                    <td className="px-6 py-4 text-gray-600">{formatMonitoringTime(summary.latestUpdatedAt)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getMonitoringStatusColor(
                          summary.status
                        )}`}
                      >
                        {getMonitoringStatusIcon(summary.status)}
                        {summary.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{summary.noteSummary}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingScheduleId(String(item.id))}
                          className="rounded-lg p-2 hover:bg-gray-100"
                          title="Lihat"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleEditSchedule(item)}
                          className="rounded-lg p-2 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit size={16} className="text-blue-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {monitoringRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                      {loadingSchedules || loadingReports
                        ? "Memuat monitoring piket kelas..."
                        : "Belum ada jadwal piket kelas untuk filter yang dipilih."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {editingScheduleId ? "Edit Jadwal Piket Kelas" : "Buat Jadwal Piket Kelas"}
            </h3>
            <p className="text-sm text-gray-500">Atur jadwal piket kelas untuk setiap guru.</p>
          </div>

          {(error || success) && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {error || success}
            </div>
          )}

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-md font-semibold text-gray-800">
              {editingScheduleId ? "Ubah Jadwal Piket" : "Tambah Jadwal Piket"}
            </h4>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Tahun</label>
                <select
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Bulan</label>
                <select
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CLASS_PICKET_MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Minggu</label>
                <select
                  value={formWeek}
                  onChange={(e) => setFormWeek(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {!editingScheduleId && (
                    <option value="all">Seluruh Minggu (Bulanan)</option>
                  )}
                  {WEEK_OPTIONS.map((week) => (
                    <option key={week} value={week}>
                      {week}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Hari</label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CLASS_PICKET_DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-4">
              {editingScheduleId ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Guru Piket</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih Guru</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Guru Piket 1</label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Pilih Guru 1</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Guru Piket 2 (Opsional)</label>
                    <select
                      value={selectedTeacherId2}
                      onChange={(e) => setSelectedTeacherId2(e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Pilih Guru 2</option>
                      {teachers.map((teacher) => (
                        teacher.id !== selectedTeacherId && (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        )
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500 font-medium">Kelas Yang Ditanggung</label>
                  {classes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedClasses.length === classes.length) {
                          setSelectedClasses([]);
                        } else {
                          setSelectedClasses(classes.map((cls) => cls.className));
                        }
                      }}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 focus:outline-none transition-colors"
                    >
                      {selectedClasses.length === classes.length ? "Hapus Semua Pilihan" : "Pilih Semua Kelas"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => (
                    <label
                      key={cls.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
                        selectedClasses.includes(cls.className)
                          ? "border-primary-500 bg-primary-50/50 text-primary-700 font-medium"
                          : "border-gray-200 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(cls.className)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClasses((prev) => [...prev, cls.className]);
                          } else {
                            setSelectedClasses((prev) => prev.filter((item) => item !== cls.className));
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{cls.className}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSchedule}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700"
            >
              <Plus size={18} />
              {editingScheduleId ? "Simpan Perubahan" : "Tambah Jadwal"}
            </button>
            {editingScheduleId && (
              <button
                onClick={resetAdminForm}
                className="ml-3 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
              >
                Batal Edit
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tahun</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Bulan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Minggu</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hari</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru Piket</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Kelas Yang Ditanggung
                  </th>
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
                    <td className="px-6 py-4 text-gray-600">{item.classes.join(", ")}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditSchedule(item)}
                          className="rounded-lg p-2 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="rounded-lg p-2 hover:bg-red-100"
                          title="Hapus"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {createdSchedules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                      {loadingSchedules
                        ? "Memuat jadwal piket kelas..."
                        : "Belum ada jadwal piket kelas yang dibuat."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingSchedule && monitoringDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-800">Detail Pelaksanaan Piket Guru</h4>
                <p className="text-sm text-gray-500">
                  {viewingSchedule.item.teacherName} • Kode Guru {viewingSchedule.item.teacherKodeGuru || "-"} •{" "}
                  {viewingSchedule.item.day}
                </p>
              </div>
              <button
                onClick={() => setViewingScheduleId(null)}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getMonitoringStatusColor(
                        viewingSchedule.summary.status
                      )}`}
                    >
                      {getMonitoringStatusIcon(viewingSchedule.summary.status)}
                      {viewingSchedule.summary.status}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Waktu Check In</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800">
                    {formatMonitoringTime(viewingSchedule.summary.latestUpdatedAt)}
                  </p>
                </div>
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Kelas Ditugaskan</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800">{viewingClassRows.length}</p>
                </div>
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Ringkasan</p>
                  <p className="mt-2 text-lg font-semibold text-gray-800">{viewingSchedule.summary.noteSummary}</p>
                </div>
              </div>

              <PicketReportSheet
                reportDate={monitoringDate}
                classRows={viewingClassRows}
                reportState={viewingReportState}
                readOnly
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
