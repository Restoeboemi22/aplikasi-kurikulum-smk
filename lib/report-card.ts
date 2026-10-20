import prisma from "@/lib/prisma";
import { DEFAULT_SUBJECTS } from "@/lib/default-subjects";
import { buildSemesterLabel, type SemesterTerm } from "@/lib/grade-period";
import type { ServerSessionUser } from "@/lib/server-session";
import type { ReportMajorCode } from "@/lib/report-profiles";

export type ReportGroup = {
  code: "A" | "B";
  name: string;
};

export const REPORT_SUBJECT_GROUPS: Record<"A" | "B", ReportGroup> = {
  A: {
    code: "A",
    name: "Kelompok Mata Pelajaran Umum",
  },
  B: {
    code: "B",
    name: "Kelompok Mata Pelajaran Kejuruan",
  },
};

export const CANONICAL_SUBJECT_CODES = [
  // Kelompok A (Umum): 1 - 7
  "PABP", "PARP", "PAI", "PAK",
  "PPS", "PKN", "PPKN",
  "BIN",
  "PJOK",
  "SEJ",
  "SBD",
  "BSJ", "MULOK",

  // Kelompok B (Kejuruan): 1 - 8
  "MTK",
  "BIG",
  "INF",
  "IPAS",
  "DDPK",
  "KK",
  "PKK",
  "PKL",
];

const subjectOrder = new Map<string, number>();
DEFAULT_SUBJECTS.forEach((subject, index) => {
  subjectOrder.set(subject.name.toLowerCase().trim(), index);
  subjectOrder.set(subject.code.toLowerCase().trim(), index);
});
subjectOrder.set("pendidikan agama dan budi pekerti", 0);
subjectOrder.set("pendidikan agama islam dan budi pekerti", 0);
subjectOrder.set("pkn", 1);
subjectOrder.set("ppkn", 1);

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
      user: {
        select: {
          name: true,
        },
      },
      homeroomClasses: {
        select: {
          id: true,
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

  const allowedClassSet = new Set<string>(
    teacher.homeroomClasses.map((item) => item.className)
  );

  const teacherName = teacher.user?.name || session.name;
  if (teacherName) {
    const matchingClasses = await prisma.classMajor.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacher: { equals: teacherName, mode: "insensitive" } },
          { homeroomTeacher: { contains: teacherName, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        className: true,
        homeroomTeacherId: true,
      },
    });

    for (const c of matchingClasses) {
      allowedClassSet.add(c.className);
      if (!c.homeroomTeacherId) {
        await prisma.classMajor.update({
          where: { id: c.id },
          data: { homeroomTeacherId: teacher.id },
        }).catch(() => null);
      }
    }
  }

  const allowedClassNames = Array.from(allowedClassSet).sort();

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

export function isExcludedFromReport(
  subject?: { code?: string | null; name?: string | null } | string | null
): boolean {
  if (!subject) return false;
  const code = (typeof subject === "string" ? "" : subject.code || "").trim().toUpperCase();
  const name = (typeof subject === "string" ? subject : subject.name || "").trim().toLowerCase();

  // Exclude BK (Bimbingan Konseling)
  if (code === "BK" || name === "bk" || name.includes("bimbingan")) return true;

  // Exclude Mata Pelajaran Pilihan (MPP) sesuai instruksi kurikulum sekolah
  if (code === "MPP" || name.includes("pilihan")) return true;

  return false;
}

export function isBKSubject(
  subject?: { code?: string | null; name?: string | null } | string | null
): boolean {
  return isExcludedFromReport(subject);
}

export function getReportGroup(
  subjectName: string,
  subjectCode?: string | null
): ReportGroup {
  const code = (subjectCode || "").trim().toUpperCase();
  const name = (subjectName || "").trim().toLowerCase();

  // Kelompok A (Kelompok Mata Pelajaran Umum): 1 - 7
  const groupACodes = [
    "PABP", "PARP", "PAI", "PAK", "PPS", "PPKN", "PKN", "BIN", "PJOK", "SEJ", "SBD", "BSJ", "MULOK",
  ];
  if (groupACodes.includes(code)) {
    return REPORT_SUBJECT_GROUPS.A;
  }

  const groupAKeywords = [
    "agama",
    "budi pekerti",
    "pancasila",
    "kewarganegaraan",
    "pkn",
    "ppkn",
    "bahasa indonesia",
    "jasmani",
    "olahraga",
    "olah raga",
    "pjok",
    "penjas",
    "sejarah",
    "seni budaya",
    "seni rupa",
    "seni musik",
    "seni tari",
    "seni teater",
    "bahasa jawa",
    "sastra jawa",
    "muatan lokal",
    "mulok",
  ];

  if (groupAKeywords.some((kw) => name.includes(kw))) {
    return REPORT_SUBJECT_GROUPS.A;
  }

  // Semua mapel kejuruan termasuk Matematika & Bahasa Inggris masuk Kelompok B
  return REPORT_SUBJECT_GROUPS.B;
}

function normalizeSubjectKey(str?: string | null): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isMatchingGrade(
  gradeSubject: string,
  targetSubject: { code?: string | null; name: string }
): boolean {
  if (isBKSubject(gradeSubject)) return false;

  const gNorm = normalizeSubjectKey(gradeSubject);
  const tNameNorm = normalizeSubjectKey(targetSubject.name);
  const tCodeNorm = normalizeSubjectKey(targetSubject.code);

  if (!gNorm) return false;

  if (gNorm === tNameNorm || (tCodeNorm && gNorm === tCodeNorm)) {
    return true;
  }

  // Agama aliases
  const isAgamaTarget =
    tCodeNorm === "pabp" ||
    tCodeNorm === "parp" ||
    tCodeNorm === "pai" ||
    tNameNorm.includes("agama");
  const isAgamaGrade =
    gNorm.includes("agama") ||
    gNorm === "pabp" ||
    gNorm === "parp" ||
    gNorm === "pai";
  if (isAgamaTarget && isAgamaGrade) return true;

  // Pancasila / PKn aliases
  const isPancasilaTarget =
    tCodeNorm === "pps" ||
    tCodeNorm === "ppkn" ||
    tCodeNorm === "pkn" ||
    tNameNorm.includes("pancasila");
  const isPancasilaGrade =
    gNorm.includes("pancasila") ||
    gNorm === "pkn" ||
    gNorm === "ppkn" ||
    gNorm === "pps";
  if (isPancasilaTarget && isPancasilaGrade) return true;

  // IPAS aliases
  const isIpasTarget =
    tCodeNorm === "ipas" ||
    tNameNorm.includes("ipas") ||
    tNameNorm.includes("alamdansosial");
  const isIpasGrade =
    gNorm === "ipas" ||
    gNorm.includes("ipas") ||
    gNorm.includes("alamdansosial");
  if (isIpasTarget && isIpasGrade) return true;

  // PKK aliases
  const isPkkTarget =
    tCodeNorm === "pkk" ||
    tNameNorm.includes("kreatif") ||
    tNameNorm.includes("kewirausahaan");
  const isPkkGrade =
    gNorm === "pkk" ||
    gNorm.includes("kreatif") ||
    gNorm.includes("kewirausahaan");
  if (isPkkTarget && isPkkGrade) return true;

  // DDPK aliases
  const isDdpkTarget =
    tCodeNorm === "ddpk" ||
    tNameNorm.includes("dasardasarprogramkeahlian");
  const isDdpkGrade =
    gNorm === "ddpk" ||
    gNorm.includes("dasardasarprogramkeahlian");
  if (isDdpkTarget && isDdpkGrade) return true;

  // KK aliases
  const isKkTarget =
    tCodeNorm === "kk" ||
    tNameNorm === "konsentrasikeahlian";
  const isKkGrade =
    gNorm === "kk" ||
    gNorm === "konsentrasikeahlian";
  if (isKkTarget && isKkGrade) return true;

  // PKL aliases
  const isPklTarget =
    tCodeNorm === "pkl" ||
    tNameNorm.includes("praktikkerjalapangan");
  const isPklGrade =
    gNorm === "pkl" ||
    gNorm.includes("praktikkerjalapangan");
  if (isPklTarget && isPklGrade) return true;

  // MPP aliases
  const isMppTarget =
    tCodeNorm === "mpp" ||
    tNameNorm.includes("matapelajaranpilihan");
  const isMppGrade =
    gNorm === "mpp" ||
    gNorm.includes("matapelajaranpilihan");
  if (isMppTarget && isMppGrade) return true;

  // BSJ / Bahasa Jawa aliases
  const isJawaTarget =
    tCodeNorm === "bsj" ||
    tNameNorm.includes("jawa");
  const isJawaGrade =
    gNorm === "bsj" ||
    gNorm.includes("jawa");
  if (isJawaTarget && isJawaGrade) return true;

  // PJOK aliases
  const isPjokTarget =
    tCodeNorm === "pjok" ||
    (tNameNorm.includes("jasmani") && tNameNorm.includes("kesehatan"));
  const isPjokGrade =
    gNorm === "pjok" ||
    (gNorm.includes("jasmani") && gNorm.includes("kesehatan")) ||
    gNorm.includes("penjasorkes");
  if (isPjokTarget && isPjokGrade) return true;

  return false;
}

export function sortReportSubjects<T extends { code?: string | null; name: string } | string>(
  subjects: T[]
): T[] {
  return [...subjects].sort((a, b) => {
    const aName = typeof a === "string" ? a : a.name;
    const aCode = typeof a === "string" ? "" : a.code || "";
    const bName = typeof b === "string" ? b : b.name;
    const bCode = typeof b === "string" ? "" : b.code || "";

    const aGroup = getReportGroup(aName, aCode).code;
    const bGroup = getReportGroup(bName, bCode).code;

    if (aGroup !== bGroup) {
      return aGroup.localeCompare(bGroup);
    }

    const aCodeUpper = aCode.trim().toUpperCase();
    const bCodeUpper = bCode.trim().toUpperCase();

    const aOrder = aCodeUpper ? CANONICAL_SUBJECT_CODES.indexOf(aCodeUpper) : -1;
    const bOrder = bCodeUpper ? CANONICAL_SUBJECT_CODES.indexOf(bCodeUpper) : -1;

    const aIdx = aOrder >= 0 ? aOrder : Number.MAX_SAFE_INTEGER;
    const bIdx = bOrder >= 0 ? bOrder : Number.MAX_SAFE_INTEGER;

    if (aIdx !== bIdx) {
      return aIdx - bIdx;
    }

    const fallbackA = subjectOrder.get(aCode.toLowerCase().trim()) ?? subjectOrder.get(aName.toLowerCase().trim()) ?? Number.MAX_SAFE_INTEGER;
    const fallbackB = subjectOrder.get(bCode.toLowerCase().trim()) ?? subjectOrder.get(bName.toLowerCase().trim()) ?? Number.MAX_SAFE_INTEGER;
    if (fallbackA !== fallbackB) {
      return fallbackA - fallbackB;
    }

    return aName.localeCompare(bName, "id");
  });
}

export function sortSubjects(subjectNames: string[]) {
  return sortReportSubjects(subjectNames);
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
