export type CurriculumSubmissionCategory = "learning" | "assessment";

export const CURRICULUM_SUBMISSION_CATEGORY_MAP: Record<CurriculumSubmissionCategory, string> = {
  learning: "LEARNING",
  assessment: "ASSESSMENT",
};

export function getCurriculumCategoryValue(category: string): string | null {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized === "learning" || normalized === "assessment") {
    return CURRICULUM_SUBMISSION_CATEGORY_MAP[normalized];
  }
  return null;
}

export function getMajorLabel(majorCode: string) {
  switch (majorCode) {
    case "TKJ":
      return "Teknik Komputer dan Jaringan";
    case "TKR":
      return "Teknik Kendaraan Ringan";
    default:
      return majorCode;
  }
}

