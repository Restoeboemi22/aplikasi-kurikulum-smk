"use client";

import type { AppUser } from "@/lib/auth-context";

export interface TeacherAssignment {
  id: string;
  subject: string;
  className: string;
  classLevel: string;
  majorCode: string;
  majorName?: string | null;
}

export interface CurrentTeacher {
  id: string;
  userId: string;
  kodeGuru: string;
  name: string;
  nip?: string;
  mataPelajaran?: string;
  tingkatKelas: string[];
  jurusan: string[];
  teachingAssignments: TeacherAssignment[];
}

export async function resolveCurrentTeacher(user: AppUser | null): Promise<CurrentTeacher | null> {
  if (!user) return null;

  const response = await fetch("/api/teachers", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Gagal memuat profil guru aktif.");
  }

  const teachers: CurrentTeacher[] = await response.json();

  return (
    teachers.find((teacher) => teacher.nip && user.nip && teacher.nip === user.nip) ??
    teachers.find((teacher) => teacher.userId === user.uid) ??
    null
  );
}

export const splitSubjects = (mataPelajaran?: string | null) =>
  (mataPelajaran || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const getTeacherSubjectOptions = (teacher?: CurrentTeacher | null) => {
  const fromAssignments = Array.from(
    new Set(
      (teacher?.teachingAssignments || [])
        .map((assignment) => assignment.subject.trim())
        .filter(Boolean)
    )
  );

  if (fromAssignments.length > 0) {
    return fromAssignments;
  }

  return splitSubjects(teacher?.mataPelajaran);
};

export const getTeacherAssignmentsBySubject = (
  teacher?: CurrentTeacher | null,
  subject?: string | null
) => {
  const assignments = teacher?.teachingAssignments || [];
  if (!subject) return assignments;
  return assignments.filter((assignment) => assignment.subject === subject);
};

export const getTeacherClassOptions = (
  teacher?: CurrentTeacher | null,
  subject?: string | null
) =>
  Array.from(
    new Map(
      getTeacherAssignmentsBySubject(teacher, subject).map((assignment) => [
        assignment.className,
        assignment,
      ])
    ).values()
  ).sort((a, b) => a.className.localeCompare(b.className, "id"));
