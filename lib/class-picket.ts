"use client";

export const CLASS_PICKET_PERIODS = ["1-2", "3-4", "5-6", "7-8"] as const;
export type ClassPicketPeriod = (typeof CLASS_PICKET_PERIODS)[number];

export type ClassPicketStatus = "empty" | "done" | "issue";
export type AdminMonitoringStatus = "Belum" | "Proses" | "Selesai";

export interface ClassPicketSchedule {
  id: number | string;
  day: string;
  teacherId?: string;
  teacherUserId?: string;
  teacherName: string;
  teacherNip?: string;
  teacherKodeGuru?: string;
  classes: string[];
  week: string;
  month: string;
  year: string;
}

export interface ClassPicketReportItem {
  id: string;
  scheduleId: string;
  teacherId: string;
  reportDate: string;
  className: string;
  period: ClassPicketPeriod;
  status: ClassPicketStatus;
  updatedAt?: string;
}

export type TeacherReportState = Record<string, Record<ClassPicketPeriod, ClassPicketStatus>>;

export const CLASS_PICKET_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const CLASS_PICKET_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const WEEK_LABELS = ["Minggu ke-I", "Minggu ke-II", "Minggu ke-III", "Minggu ke-IV", "Minggu ke-V"];

const DAY_INDEX_MAP: Record<string, number> = {
  Minggu: 0,
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
};

export function normalizeClassPicketSchedule(raw: any): ClassPicketSchedule | null {
  if (!raw || !raw.teacherName || !raw.day) return null;

  return {
    id: raw.id ?? `${raw.teacherName}-${raw.day}-${raw.week}-${raw.month}-${raw.year}`,
    day: String(raw.day),
    teacherId: raw.teacherId ? String(raw.teacherId) : undefined,
    teacherUserId: raw.teacherUserId ? String(raw.teacherUserId) : undefined,
    teacherName: String(raw.teacherName),
    teacherNip: raw.teacherNip ? String(raw.teacherNip) : undefined,
    teacherKodeGuru: raw.teacherKodeGuru ? String(raw.teacherKodeGuru) : undefined,
    classes: Array.isArray(raw.classes)
      ? raw.classes.map((item: unknown) => String(item).trim()).filter(Boolean)
      : String(raw.classes || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    week: String(raw.week || ""),
    month: String(raw.month || ""),
    year: String(raw.year || ""),
  };
}

export function normalizeClassPicketReport(raw: any): ClassPicketReportItem | null {
  if (!raw || !raw.scheduleId || !raw.className || !raw.period) return null;

  const normalizedPeriod = String(raw.period) as ClassPicketPeriod;
  const normalizedStatus = String(raw.status) as ClassPicketStatus;
  if (!CLASS_PICKET_PERIODS.includes(normalizedPeriod)) return null;
  if (!["empty", "done", "issue"].includes(normalizedStatus)) return null;

  return {
    id: String(raw.id ?? `${raw.scheduleId}-${raw.reportDate}-${raw.className}-${raw.period}`),
    scheduleId: String(raw.scheduleId),
    teacherId: String(raw.teacherId || ""),
    reportDate: String(raw.reportDate || ""),
    className: String(raw.className),
    period: normalizedPeriod,
    status: normalizedStatus,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export function getClassPicketMonthName(date: Date) {
  return CLASS_PICKET_MONTHS[date.getMonth()] || "";
}

export function getClassPicketDayName(date: Date) {
  const dayIndex = date.getDay();
  const dayMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return dayMap[dayIndex] || "";
}

export function getClassPicketWeekLabel(date: Date) {
  const weekNumber = Math.min(Math.ceil(date.getDate() / 7), WEEK_LABELS.length) - 1;
  return WEEK_LABELS[Math.max(weekNumber, 0)] || WEEK_LABELS[0];
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatPicketReportDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = getClassPicketMonthName(date).toUpperCase();
  const year = date.getFullYear();
  const dayName = getClassPicketDayName(date).toUpperCase();
  return `${dayName}, ${day} ${month} ${year}`;
}

export function isGraduatedClass(className: string) {
  return className.trim().toUpperCase().startsWith("XII ");
}

export function matchesTeacherScheduleIdentity(
  schedule: ClassPicketSchedule,
  teacher: {
    id?: string | null;
    userId?: string | null;
    name?: string | null;
    nip?: string | null;
    kodeGuru?: string | null;
  }
) {
  const normalizedTeacherName = String(teacher.name || "").trim().toLowerCase();
  return (
    (schedule.teacherId && teacher.id && schedule.teacherId === teacher.id) ||
    (schedule.teacherUserId && teacher.userId && schedule.teacherUserId === teacher.userId) ||
    (schedule.teacherNip && teacher.nip && schedule.teacherNip === teacher.nip) ||
    (schedule.teacherKodeGuru && teacher.kodeGuru && schedule.teacherKodeGuru === teacher.kodeGuru) ||
    (schedule.teacherName.trim().toLowerCase() === normalizedTeacherName && Boolean(normalizedTeacherName))
  );
}

export function buildEmptyClassRow(): Record<ClassPicketPeriod, ClassPicketStatus> {
  return CLASS_PICKET_PERIODS.reduce(
    (acc, period) => ({ ...acc, [period]: "empty" }),
    {} as Record<ClassPicketPeriod, ClassPicketStatus>
  );
}

export function buildTeacherReportStateFromReports(
  classNames: string[],
  reports: ClassPicketReportItem[]
): TeacherReportState {
  const nextState: TeacherReportState = {};

  classNames.forEach((className) => {
    nextState[className] = buildEmptyClassRow();
  });

  reports.forEach((report) => {
    if (!nextState[report.className]) {
      nextState[report.className] = buildEmptyClassRow();
    }
    nextState[report.className][report.period] = report.status;
  });

  return nextState;
}

export function flattenTeacherReportState(
  state: TeacherReportState,
  schedules: Pick<ClassPicketSchedule, "id" | "classes">[],
  reportDate: string
) {
  return Object.entries(state).flatMap(([className, periods]) =>
    CLASS_PICKET_PERIODS.flatMap((period) => {
      const status = periods?.[period] || "empty";
      if (status === "empty") return [];

      return schedules
        .filter((schedule) => schedule.classes.includes(className))
        .map((schedule) => ({
        scheduleId: String(schedule.id),
        reportDate,
        className,
        period,
        status,
      }));
    })
  );
}

export function getMonitoringSummaryForSchedule(
  schedule: ClassPicketSchedule,
  reports: ClassPicketReportItem[]
) {
  const activeClasses = schedule.classes.filter((className) => !isGraduatedClass(className));
  const totalExpected = activeClasses.length * CLASS_PICKET_PERIODS.length;

  const relevantReports = reports.filter(
    (report) => report.scheduleId === String(schedule.id) && schedule.classes.includes(report.className)
  );
  const doneCount = relevantReports.filter((report) => report.status === "done").length;
  const issueCount = relevantReports.filter((report) => report.status === "issue").length;
  const filledCount = doneCount + issueCount;
  const emptyCount = Math.max(totalExpected - filledCount, 0);

  let status: AdminMonitoringStatus = "Belum";
  if (totalExpected === 0 || (filledCount > 0 && emptyCount === 0)) {
    status = "Selesai";
  } else if (filledCount > 0) {
    status = "Proses";
  }

  const latestUpdatedAt = relevantReports
    .map((report) => (report.updatedAt ? new Date(report.updatedAt).getTime() : 0))
    .filter(Boolean)
    .sort((a, b) => a - b)
    .pop();

  return {
    totalExpected,
    doneCount,
    issueCount,
    filledCount,
    emptyCount,
    status,
    latestUpdatedAt,
    noteSummary:
      issueCount > 0
        ? `${issueCount} catatan/masalah`
        : filledCount > 0
        ? `${filledCount} tanda terisi`
        : "-",
  };
}

export function getDateFromScheduleFilter({
  year,
  month,
  week,
  day,
}: {
  year: string;
  month: string;
  week: string;
  day: string;
}) {
  const monthIndex = CLASS_PICKET_MONTHS.indexOf(month);
  const dayIndex = DAY_INDEX_MAP[day];
  const weekIndex = WEEK_LABELS.indexOf(week);
  if (monthIndex < 0 || dayIndex === undefined || weekIndex < 0 || !year) return null;

  const dates: number[] = [];
  const lastDate = new Date(Number(year), monthIndex + 1, 0).getDate();
  for (let date = 1; date <= lastDate; date += 1) {
    const current = new Date(Number(year), monthIndex, date);
    if (current.getDay() === dayIndex) {
      dates.push(date);
    }
  }

  const selectedDate = dates[Math.min(weekIndex, dates.length - 1)];
  if (!selectedDate) return null;

  return new Date(Number(year), monthIndex, selectedDate);
}
