import prisma from "@/lib/prisma";
import { DEFAULT_SUBJECTS } from "@/lib/default-subjects";
import { buildSemesterLabel, type SemesterTerm } from "@/lib/grade-period";
import type { ServerSessionUser } from "@/lib/server-session";
import type { ReportMajorCode } from "@/lib/report-profiles";

const SUBJECT_GROUPS = {
  A: {
    code: "A",
    name: "Kelompok Mata Pelajaran Umum",
    subjects: [
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Pancasila",
      "Bahasa Indonesia",
      "Pendidikan Jasmani , Olah Raga dan Kesehatan",
      "Sejarah",
      "Seni Budaya",
      "Bahasa dan Sastra Jawa",
      "Matematika",
      "Bahasa Inggris",
    ],
  },
  B: {
    code: "B",
    name: "Mata Pelajaran Kejuruan",
    subjects: [
      "Informatika",
      "Projek Ilmu Pengetahuan Alam dan Sosial",
      "Dasar-Dasar Program Keahlian",
      "Konsentrasi Keahlian",
      "Projek Kreatif dan Kewirausahaan",
      "Praktik Kerja Lapangan",
      "Mata Pelajaran pilihan",
    ],
  },
} as const;

const subjectOrder = new Map(DEFAULT_SUBJECTS.map((subject, index) => [subject.name, index]));

type GradeRecord = {
  subject: string;
  jenisPenilaian: "UH" | "TUGAS" | "STS" | "SAS" | "SIKAP";
  nilai1: string | null;
  nilai2: string | null;
  nilai3: string | null;
  nilaiAkhir: string | null;
};

export async function resolveReportViewerAccess(session: ServerSessionUser) {
  if (session.role === "ADMIN") {
    return {
      role: "ADMIN" as const,
      teacherId: null,
      allowedClassNames: [] as string[],
      isHomeroomTeacher: false,
    };
  }

  const teacher = await prisma.teacher.findFirst({
    where: {
      OR: [
        { userId: session.uid },
        session.nip ? { user: { nip: session.nip } } : null,
      ].filter(Boolean) as any[],
    },
    select: {
      id: true,
      homeroomClasses: {
        select: {
          className: true,
        },
        orderBy: {
          className: "asc",
        },
      },
    },
  });

  if (!teacher) {
    return null;
  }

  const allowedClassNames = teacher.homeroomClasses.map((item) => item.className);

  return {
    role: "TEACHER" as const,
    teacherId: teacher.id,
    allowedClassNames,
    isHomeroomTeacher: allowedClassNames.length > 0,
  };
}

export function canAccessReportClass(
  viewer: { role: "ADMIN" | "TEACHER"; allowedClassNames: string[] },
  className?: string | null
) {
  if (viewer.role === "ADMIN") return true;
  if (!className) return false;
  return viewer.allowedClassNames.includes(className);
}

export function matchesReportMajorCode(
  reportMajorCode?: ReportMajorCode | string | null,
  source?: {
    className?: string | null;
    majorCode?: string | null;
    majorName?: string | null;
  } | null
) {
  if (!reportMajorCode) return true;
  if (!source) return false;

  const expected = reportMajorCode.trim().toUpperCase();
  const className = (source.className || "").trim().toUpperCase();
  const majorCode = (source.majorCode || "").trim().toUpperCase();
  const majorName = (source.majorName || "").trim().toUpperCase();

  if (className.includes(` ${expected} `) || className.endsWith(` ${expected}`)) {
    return true;
  }

  if (majorCode === expected) {
    return true;
  }

  if (expected === "TKJ" && majorName.includes("KOMPUTER") && majorName.includes("JARINGAN")) {
    return true;
  }

  if (expected === "TKR" && majorName.includes("KENDARAAN") && majorName.includes("RINGAN")) {
    return true;
  }

  return false;
}

export function getReportGroup(subjectName: string) {
  const inGroupA = (SUBJECT_GROUPS.A.subjects as readonly string[]).includes(subjectName);
  if (inGroupA) {
    return SUBJECT_GROUPS.A;
  }

  const inGroupB = (SUBJECT_GROUPS.B.subjects as readonly string[]).includes(subjectName);
  if (inGroupB) {
    return SUBJECT_GROUPS.B;
  }

  return {
    code: "L",
    name: "Mata Pelajaran Lainnya",
  };
}

export function sortSubjects(subjectNames: string[]) {
  return [...subjectNames].sort((a, b) => {
    const aOrder = subjectOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = subjectOrder.get(b) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.localeCompare(b, "id");
  });
}

export function buildSemesterReportLabel(term: SemesterTerm, academicYear: string) {
  return buildSemesterLabel(term, academicYear);
}

export function getPhaseFromClassLevel(classLevel?: string | null) {
  if (classLevel === "X") return "E";
  if (classLevel === "XI" || classLevel === "XII") return "F";
  return "-";
}

function toNumber(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function averageNumbers(values: Array<string | null | undefined>) {
  const parsed = values
    .map((value) => toNumber(value))
    .filter((value): value is number => value !== null);

  if (parsed.length === 0) return null;

  return parsed.reduce((sum, value) => sum + value, 0) / parsed.length;
}

function roundScore(value: number | null) {
  if (value === null) return null;
  return Math.round(value * 100) / 100;
}

export function calculateFinalScore(records: GradeRecord[], variant: "STS" | "SAS" = "SAS") {
  const byType = new Map(records.map((record) => [record.jenisPenilaian, record]));

  const uhAverage = roundScore(
    averageNumbers([
      byType.get("UH")?.nilai1,
      byType.get("UH")?.nilai2,
      byType.get("UH")?.nilai3,
    ])
  );
  const tugasAverage = roundScore(
    averageNumbers([
      byType.get("TUGAS")?.nilai1,
      byType.get("TUGAS")?.nilai2,
      byType.get("TUGAS")?.nilai3,
    ])
  );
  const stsScore = toNumber(byType.get("STS")?.nilaiAkhir);
  const sasScore = toNumber(byType.get("SAS")?.nilaiAkhir);
  const sikapScore = byType.get("SIKAP")?.nilaiAkhir ?? null;

  let finalScore: number | null = null;
  
  if (variant === "STS") {
    if (uhAverage !== null && tugasAverage !== null && stsScore !== null) {
      finalScore = roundScore(
        uhAverage * 0.3 + tugasAverage * 0.2 + stsScore * 0.5
      );
    }
  } else {
    if (uhAverage !== null && tugasAverage !== null && stsScore !== null && sasScore !== null) {
      finalScore = roundScore(
        uhAverage * 0.3 + tugasAverage * 0.2 + stsScore * 0.2 + sasScore * 0.3
      );
    }
  }

  return {
    uhAverage,
    tugasAverage,
    stsScore,
    sasScore,
    sikapScore,
    finalScore,
    roundedScore: finalScore === null ? null : Math.round(finalScore),
  };
}

function uniqueObjectives(objectives: string[]) {
  return Array.from(
    new Set(
      objectives
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function summarizeTeachingObjectives(objectives: string[]) {
  const items = uniqueObjectives(objectives);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;

  const compactItems = items.slice(0, 3);
  if (items.length > 3) {
    return `${compactItems[0]}, ${compactItems[1]}, serta ${compactItems[2]} dan tujuan pembelajaran terkait lainnya`;
  }

  return `${compactItems[0]}, ${compactItems[1]}, serta ${compactItems[2]}`;
}

function getAchievementLevel(score: number) {
  if (score >= 91) return "sangat baik";
  if (score >= 83) return "baik";
  if (score >= 78) return "cukup";
  return "kurang";
}

export function buildCompetenceNote(subjectName: string, score: number | null, objectives: string[] = []) {
  if (score === null) {
    return `Data penilaian untuk ${subjectName} belum lengkap sehingga deskripsi capaian pembelajaran belum dapat dibuat.`;
  }

  const summarizedObjectives = summarizeTeachingObjectives(objectives);
  const level = getAchievementLevel(score);

  if (summarizedObjectives) {
    return `Ananda ${level} dalam ${summarizedObjectives}.`;
  }

  return `Ananda ${level} dalam capaian pembelajaran mata pelajaran ${subjectName}.`;
}
