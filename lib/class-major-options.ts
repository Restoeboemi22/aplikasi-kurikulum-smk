export interface ClassMajorOption {
  id?: string;
  className: string;
  grade: string;
  majorCode: string;
  majorName?: string | null;
}

const gradeOrder = ["X", "XI", "XII"];

const compareGrade = (a: string, b: string) => {
  const aIndex = gradeOrder.indexOf(a);
  const bIndex = gradeOrder.indexOf(b);

  if (aIndex === -1 && bIndex === -1) {
    return a.localeCompare(b);
  }

  if (aIndex === -1) return 1;
  if (bIndex === -1) return -1;

  return aIndex - bIndex;
};

export const getGradeOptions = (classMajors: ClassMajorOption[]) =>
  Array.from(new Set(classMajors.map((item) => item.grade).filter(Boolean))).sort(compareGrade);

export const getMajorOptions = (classMajors: ClassMajorOption[], grade?: string) => {
  const majors = new Map<string, string>();

  classMajors.forEach((item) => {
    if (grade && item.grade !== grade) return;
    if (!item.majorCode) return;

    majors.set(item.majorCode, item.majorName || item.majorCode);
  });

  return Array.from(majors.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));
};
