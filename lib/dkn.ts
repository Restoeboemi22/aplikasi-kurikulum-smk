import { getReportProfile } from "@/lib/report-profiles";

export type DKNSubjectGroup = "UMUM" | "KEJURUAN";

export type DKNSubjectConfig = {
  name: string;
  headerLabel: string;
  shortLabel: string;
  orderLabel: string;
  group: DKNSubjectGroup;
};

export const DKN_SUBJECTS: DKNSubjectConfig[] = [
  {
    name: "Pendidikan Agama dan Budi Pekerti",
    headerLabel: "Pend.Agama dan Budi Pekerti",
    shortLabel: "PABP",
    orderLabel: "1",
    group: "UMUM",
  },
  {
    name: "Pendidikan Pancasila",
    headerLabel: "Pendidikan Pancasila",
    shortLabel: "Pancasila",
    orderLabel: "2",
    group: "UMUM",
  },
  {
    name: "Bahasa Indonesia",
    headerLabel: "B. Indonesia",
    shortLabel: "B. Indo",
    orderLabel: "3",
    group: "UMUM",
  },
  {
    name: "Pendidikan Jasmani , Olah Raga dan Kesehatan",
    headerLabel: "PJOK",
    shortLabel: "PJOK",
    orderLabel: "4",
    group: "UMUM",
  },
  {
    name: "Sejarah",
    headerLabel: "Sejarah",
    shortLabel: "Sejarah",
    orderLabel: "5",
    group: "UMUM",
  },
  {
    name: "Seni Budaya",
    headerLabel: "Seni Budaya",
    shortLabel: "Senbud",
    orderLabel: "6",
    group: "UMUM",
  },
  {
    name: "Bahasa dan Sastra Jawa",
    headerLabel: "Mulok",
    shortLabel: "Mulok",
    orderLabel: "7",
    group: "UMUM",
  },
  {
    name: "Matematika",
    headerLabel: "Matematika",
    shortLabel: "MTK",
    orderLabel: "8",
    group: "KEJURUAN",
  },
  {
    name: "Bahasa Inggris",
    headerLabel: "B. Inggris",
    shortLabel: "B. Ing",
    orderLabel: "9",
    group: "KEJURUAN",
  },
  {
    name: "Informatika",
    headerLabel: "Informatika",
    shortLabel: "Info",
    orderLabel: "10",
    group: "KEJURUAN",
  },
  {
    name: "Projek Ilmu Pengetahuan Alam dan Sosial",
    headerLabel: "Projek Ipas",
    shortLabel: "IPAS",
    orderLabel: "11",
    group: "KEJURUAN",
  },
  {
    name: "Dasar-Dasar Program Keahlian",
    headerLabel: "Dasar-2 Prog Keahlian",
    shortLabel: "DDPK",
    orderLabel: "12",
    group: "KEJURUAN",
  },
  {
    name: "Konsentrasi Keahlian",
    headerLabel: "Kons Keahlian",
    shortLabel: "Kons",
    orderLabel: "13",
    group: "KEJURUAN",
  },
  {
    name: "Projek Kreatif dan Kewirausahaan",
    headerLabel: "PKK",
    shortLabel: "PKK",
    orderLabel: "14",
    group: "KEJURUAN",
  },
  {
    name: "Praktik Kerja Lapangan",
    headerLabel: "Praktek kerja Lapangan",
    shortLabel: "PKL",
    orderLabel: "15",
    group: "KEJURUAN",
  },
  {
    name: "Mata Pelajaran pilihan",
    headerLabel: "Mapel Pilihan",
    shortLabel: "Pilihan",
    orderLabel: "16",
    group: "KEJURUAN",
  },
];

export const DKN_CRITERIA = {
  reportWeightPercent: 50,
  psajWeightPercent: 50,
  minimumReportAverage: 70,
  minimumPsajScore: 65,
  minimumNspAverage: 75,
} as const;

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export function getDKNConcentration(majorCode?: string | null, majorName?: string | null) {
  const profile = getReportProfile(majorCode);
  return profile?.konsentrasiKeahlian || majorName || majorCode || "-";
}

export function normalizeGenderLabel(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "-";
  if (["l", "lk", "laki-laki", "laki laki", "male", "pria"].includes(normalized)) return "L";
  if (["p", "pr", "perempuan", "female", "wanita"].includes(normalized)) return "P";
  return value || "-";
}

export function calculateAverage(values: Array<number | null | undefined>) {
  const numericValues = values.filter((value): value is number => typeof value === "number");
  if (numericValues.length === 0) return null;
  const total = numericValues.reduce((sum, value) => sum + value, 0);
  return roundTwo(total / numericValues.length);
}

export function calculateMinimum(values: Array<number | null | undefined>) {
  const numericValues = values.filter((value): value is number => typeof value === "number");
  if (numericValues.length === 0) return null;
  return Math.min(...numericValues);
}

export function calculateTotal(values: Array<number | null | undefined>) {
  const numericValues = values.filter((value): value is number => typeof value === "number");
  if (numericValues.length === 0) return null;
  return roundTwo(numericValues.reduce((sum, value) => sum + value, 0));
}

export function calculateNspScore(reportScore: number | null, psajScore: number | null) {
  if (reportScore === null && psajScore === null) return null;
  if (reportScore === null) return psajScore;
  if (psajScore === null) return reportScore;

  return roundTwo(
    reportScore * (DKN_CRITERIA.reportWeightPercent / 100) +
      psajScore * (DKN_CRITERIA.psajWeightPercent / 100)
  );
}

export function determineDknStatus(args: {
  reportAverage: number | null;
  psajMinimum: number | null;
  nspAverage: number | null;
}) {
  const { reportAverage, psajMinimum, nspAverage } = args;
  if (reportAverage === null || psajMinimum === null || nspAverage === null) {
    return "";
  }

  return reportAverage >= DKN_CRITERIA.minimumReportAverage &&
    psajMinimum >= DKN_CRITERIA.minimumPsajScore &&
    nspAverage >= DKN_CRITERIA.minimumNspAverage
    ? "L"
    : "TL";
}
