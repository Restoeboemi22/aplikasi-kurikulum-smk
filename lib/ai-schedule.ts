export const AI_SCHEDULE_TIME_SLOTS = [
  { no: 1, time: "07.30-08.00" },
  { no: 2, time: "08.00-08.30" },
  { no: 3, time: "08.30-09.00" },
  { no: 4, time: "09.00-09.30" },
  { no: 5, time: "10.00-10.30" },
  { no: 6, time: "10.30-11.00" },
  { no: 7, time: "11.00-11.30" },
  { no: 8, time: "11.30-12.00" },
] as const;

export const AI_SCHEDULE_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export const DEFAULT_DAY_TIME_SLOTS: Record<string, number[]> = {
  Senin: [1, 2, 3, 4, 5, 6, 7, 8],
  Selasa: [1, 2, 3, 4, 5, 6, 7, 8],
  Rabu: [1, 2, 3, 4, 5, 6, 7, 8],
  Kamis: [1, 2, 3, 4, 5, 6, 7, 8],
  Jumat: [1, 2, 3, 4, 5, 6],
  Sabtu: [1, 2, 3, 4, 5],
};

export const DEFAULT_AI_PRIORITIES = {
  minimizeConsecutive: true,
  balanceLoad: true,
  avoidConflicts: false,
};

export type AiSchedulePriorities = typeof DEFAULT_AI_PRIORITIES;

export interface AiScheduleConfigPayload {
  academicYear: string;
  semester: string;
  scheduleTeachers: any[];
  editableDayTimeSlots: Record<string, number[]>;
  religiousRestrictions: any[];
  priorities: AiSchedulePriorities;
}

export function getDefaultAcademicYear() {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const startYear = month >= 7 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

export function getDefaultAiScheduleConfig(): AiScheduleConfigPayload {
  return {
    academicYear: getDefaultAcademicYear(),
    semester: "Ganjil",
    scheduleTeachers: [],
    editableDayTimeSlots: DEFAULT_DAY_TIME_SLOTS,
    religiousRestrictions: [],
    priorities: DEFAULT_AI_PRIORITIES,
  };
}

export function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

