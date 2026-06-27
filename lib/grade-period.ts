export type SemesterTerm = "Ganjil" | "Genap";

export const SEMESTER_OPTIONS: SemesterTerm[] = ["Ganjil", "Genap"];

export function buildSemesterLabel(term: SemesterTerm, academicYear: string): string {
  return `${term} ${academicYear}`;
}

export function parseSemesterLabel(label?: string | null): {
  term: SemesterTerm;
  academicYear: string;
} {
  const normalized = (label || "").trim();
  const match = normalized.match(/^(Ganjil|Genap)\s+(\d{4}\/\d{4})$/i);

  if (!match) {
    return getDefaultGradePeriod();
  }

  const [, rawTerm, academicYear] = match;
  const term = rawTerm === "Genap" ? "Genap" : "Ganjil";

  return { term, academicYear };
}

export function getAcademicYearOptions(baseYear = new Date().getFullYear()): string[] {
  const years = new Set<string>();

  for (let offset = -1; offset <= 2; offset += 1) {
    const startYear = baseYear + offset;
    years.add(`${startYear}/${startYear + 1}`);
  }

  return Array.from(years).sort();
}

export function getDefaultGradePeriod(date = new Date()): {
  term: SemesterTerm;
  academicYear: string;
} {
  const month = date.getMonth() + 1;
  const startYear = month >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  const term: SemesterTerm = month >= 7 ? "Ganjil" : "Genap";

  return {
    term,
    academicYear: `${startYear}/${startYear + 1}`,
  };
}
