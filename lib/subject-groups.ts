export type SubjectGroupCode = "A" | "B" | "BK";

export type SubjectGroupInfo = {
  code: SubjectGroupCode;
  name: string;
  badgeLabel: string;
  description: string;
};

export const SUBJECT_GROUPS: Record<SubjectGroupCode, SubjectGroupInfo> = {
  A: {
    code: "A",
    name: "Kelompok Mata Pelajaran Umum",
    badgeLabel: "Kelompok A (Umum)",
    description: "Mata pelajaran muatan umum/nasional sesuai struktur kurikulum resmi",
  },
  B: {
    code: "B",
    name: "Kelompok Mata Pelajaran Kejuruan",
    badgeLabel: "Kelompok B (Kejuruan)",
    description: "Mata pelajaran muatan kejuruan, dasar, dan konsentrasi keahlian",
  },
  BK: {
    code: "BK",
    name: "Layanan Bimbingan dan Konseling (BK)",
    badgeLabel: "BK (Non-Raport)",
    description: "Layanan konseling siswa (khusus pembinaan, tidak dicetak di nilai raport)",
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

  // Layanan BK
  "BK",
];

export function isBK(subject?: { code?: string | null; name?: string | null } | string | null): boolean {
  if (!subject) return false;
  const code = (typeof subject === "string" ? "" : subject.code || "").trim().toUpperCase();
  const name = (typeof subject === "string" ? subject : subject.name || "").trim().toLowerCase();
  return code === "BK" || name === "bk" || name.includes("bimbingan");
}

export function isMPP(subject?: { code?: string | null; name?: string | null } | string | null): boolean {
  if (!subject) return false;
  const code = (typeof subject === "string" ? "" : subject.code || "").trim().toUpperCase();
  const name = (typeof subject === "string" ? subject : subject.name || "").trim().toLowerCase();
  return code === "MPP" || name.includes("pilihan");
}

export function getSubjectGroup(
  name: string,
  code?: string | null
): SubjectGroupInfo {
  if (isBK({ code, name })) {
    return SUBJECT_GROUPS.BK;
  }

  const c = (code || "").trim().toUpperCase();
  const n = (name || "").trim().toLowerCase();

  const groupACodes = [
    "PABP", "PARP", "PAI", "PAK", "PPS", "PPKN", "PKN", "BIN", "PJOK", "SEJ", "SBD", "BSJ", "MULOK",
  ];
  if (groupACodes.includes(c)) {
    return SUBJECT_GROUPS.A;
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

  if (groupAKeywords.some((kw) => n.includes(kw))) {
    return SUBJECT_GROUPS.A;
  }

  // Semua mapel kejuruan termasuk MTK & BIG masuk Kelompok B
  return SUBJECT_GROUPS.B;
}

export function sortSubjectsWithGroup<T extends { code?: string | null; name: string }>(subjects: T[]): T[] {
  return [...subjects].sort((a, b) => {
    const aGrp = getSubjectGroup(a.name, a.code);
    const bGrp = getSubjectGroup(b.name, b.code);

    const grpOrder: Record<SubjectGroupCode, number> = { A: 1, B: 2, BK: 3 };
    if (grpOrder[aGrp.code] !== grpOrder[bGrp.code]) {
      return grpOrder[aGrp.code] - grpOrder[bGrp.code];
    }

    const aCodeUpper = (a.code || "").trim().toUpperCase();
    const bCodeUpper = (b.code || "").trim().toUpperCase();

    const aOrder = aCodeUpper ? CANONICAL_SUBJECT_CODES.indexOf(aCodeUpper) : -1;
    const bOrder = bCodeUpper ? CANONICAL_SUBJECT_CODES.indexOf(bCodeUpper) : -1;

    const aIdx = aOrder >= 0 ? aOrder : Number.MAX_SAFE_INTEGER;
    const bIdx = bOrder >= 0 ? bOrder : Number.MAX_SAFE_INTEGER;

    if (aIdx !== bIdx) {
      return aIdx - bIdx;
    }

    return a.name.localeCompare(b.name, "id");
  });
}
