export const RELIGIOUS_PICKET_DAYS = ["Selasa", "Rabu", "Kamis", "Jumat"] as const;
export const RELIGIOUS_PICKET_WEEKS = [
  "Minggu ke-I",
  "Minggu ke-II",
  "Minggu ke-III",
  "Minggu ke-IV",
  "Minggu ke-V",
] as const;
export const RELIGIOUS_PICKET_MONTHS = [
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
] as const;

export interface ReligiousPicketSchedule {
  id: string;
  teacherId: string;
  teacherUserId?: string;
  teacherName: string;
  teacherNip?: string;
  teacherKodeGuru?: string;
  day: string;
  week: string;
  month: string;
  year: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReligiousPicketReport {
  id: string;
  scheduleId: string;
  teacherId: string;
  reportDate: string;
  status: string;
  checkInTime?: string | null;
  notes?: string | null;
  updatedAt?: string;
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getReligiousPicketMonthName(date: Date) {
  return RELIGIOUS_PICKET_MONTHS[date.getMonth()] || "";
}

export function getReligiousPicketDayName(date: Date) {
  const dayMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return dayMap[date.getDay()] || "";
}

export function getReligiousPicketWeekLabel(date: Date) {
  const weekNumber = Math.min(Math.ceil(date.getDate() / 7), RELIGIOUS_PICKET_WEEKS.length) - 1;
  return RELIGIOUS_PICKET_WEEKS[Math.max(weekNumber, 0)] || RELIGIOUS_PICKET_WEEKS[0];
}

export function getMonitoringSummaryForReligiousPicket(reports: ReligiousPicketReport[]) {
  if (reports.length === 0) {
    return {
      status: "Belum",
      checkInTime: "-",
      notes: "-",
      latestUpdatedAt: "",
    };
  }

  const latestReport = [...reports]
    .sort((a, b) => new Date(b.updatedAt || b.checkInTime || 0).getTime() - new Date(a.updatedAt || a.checkInTime || 0).getTime())
    [0];

  return {
    status: reports.some((report) => report.status === "Sudah") ? "Sudah" : "Belum",
    checkInTime: latestReport?.checkInTime || "-",
    notes: latestReport?.notes?.trim() ? latestReport.notes : "-",
    latestUpdatedAt: latestReport?.updatedAt || "",
  };
}

