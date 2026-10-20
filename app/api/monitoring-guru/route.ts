import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/server-session";
import { buildSemesterLabel, getDefaultGradePeriod } from "@/lib/grade-period";

interface AssignmentProgressItem {
  id: string;
  className: string;
  subject: string;
  classLevel: string;
  majorCode: string;
  totalStudents: number;
  tpCount: number;
  tpScore: number;
  uhCount: number;
  uhScore: number;
  tugasCount: number;
  tugasScore: number;
  stsCount: number;
  stsScore: number;
  sasCount: number;
  sasScore: number;
  sikapCount: number;
  sikapScore: number;
  progress: number;
  status: "SUDAH" | "PROSES" | "BELUM";
}

interface TeacherMonitoringItem {
  id: string;
  kodeGuru: string;
  name: string;
  nip: string;
  email: string;
  phone?: string | null;
  totalAssignments: number;
  completedAssignments: number;
  overallProgress: number;
  status: "SUDAH" | "PROSES" | "BELUM";
  curriculumCount: number;
  journalCount: number;
  assignments: AssignmentProgressItem[];
}

export async function GET(request: NextRequest) {
  try {
    // 1. Role Authorization: Khusus ADMIN saja
    requireRole(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const defaultPeriod = getDefaultGradePeriod();
    const academicYear = searchParams.get("academicYear") || defaultPeriod.academicYear;
    const semester = (searchParams.get("semester") as "Ganjil" | "Genap") || defaultPeriod.term;
    const semesterLabel = buildSemesterLabel(semester, academicYear);

    // 2. Ambil semua data guru dan penugasan mengajarnya
    const [teachers, classMajors, students, grades, objectives, submissions, journals] =
      await Promise.all([
        prisma.teacher.findMany({
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                nip: true,
              },
            },
            teachingAssignments: true,
          },
          orderBy: { kodeGuru: "asc" },
        }),
        prisma.classMajor.findMany({
          select: {
            id: true,
            className: true,
            grade: true,
            majorCode: true,
            majorName: true,
          },
        }),
        prisma.student.findMany({
          select: {
            id: true,
            className: true,
          },
        }),
        prisma.grade.findMany({
          where: {
            semester: semesterLabel,
          },
          select: {
            studentId: true,
            teacherId: true,
            subject: true,
            classLevel: true,
            major: true,
            jenisPenilaian: true,
            nilai1: true,
            nilai2: true,
            nilai3: true,
            nilaiAkhir: true,
          },
        }),
        prisma.teachingObjective.findMany({
          where: {
            academicYear,
            semester,
          },
          select: {
            teacherId: true,
            subject: true,
            className: true,
          },
        }),
        prisma.curriculumSubmission.findMany({
          select: {
            teacherId: true,
            category: true,
            status: true,
          },
        }),
        prisma.journal.findMany({
          where: {
            semester,
            academicYear,
          },
          select: {
            teacherId: true,
          },
        }),
      ]);

    // 3. Petakan jumlah siswa per kelas
    const studentCountByClass: Record<string, number> = {};
    const studentClassById: Record<string, string> = {};
    for (const student of students) {
      if (student.className) {
        const cls = student.className.trim();
        studentCountByClass[cls] = (studentCountByClass[cls] || 0) + 1;
        studentClassById[student.id] = cls;
      }
    }

    // 4. Petakan Tujuan Pembelajaran (TP)
    const tpCountMap = new Map<string, number>();
    for (const obj of objectives) {
      const key = `${obj.teacherId}__${obj.className.trim()}__${obj.subject.trim()}`;
      tpCountMap.set(key, (tpCountMap.get(key) || 0) + 1);
    }

    // 5. Petakan Nilai Siswa (Grade)
    type GradeSets = {
      UH: Set<string>;
      TUGAS: Set<string>;
      STS: Set<string>;
      SAS: Set<string>;
      SIKAP: Set<string>;
    };
    const gradeMap = new Map<string, GradeSets>();

    for (const grade of grades) {
      const studentClass = studentClassById[grade.studentId];
      if (!studentClass) continue;

      const key = `${grade.teacherId}__${studentClass.trim()}__${grade.subject.trim()}`;
      let sets = gradeMap.get(key);
      if (!sets) {
        sets = {
          UH: new Set(),
          TUGAS: new Set(),
          STS: new Set(),
          SAS: new Set(),
          SIKAP: new Set(),
        };
        gradeMap.set(key, sets);
      }

      const hasValue = Boolean(
        (grade.nilai1 && grade.nilai1.trim() !== "") ||
        (grade.nilai2 && grade.nilai2.trim() !== "") ||
        (grade.nilai3 && grade.nilai3.trim() !== "") ||
        (grade.nilaiAkhir && grade.nilaiAkhir.trim() !== "")
      );

      if (hasValue && sets[grade.jenisPenilaian]) {
        sets[grade.jenisPenilaian].add(grade.studentId);
      }
    }

    // 6. Hitung Perangkat & Jurnal per guru
    const curriculumCountMap: Record<string, number> = {};
    for (const sub of submissions) {
      if (sub.teacherId) {
        curriculumCountMap[sub.teacherId] = (curriculumCountMap[sub.teacherId] || 0) + 1;
      }
    }

    const journalCountMap: Record<string, number> = {};
    for (const j of journals) {
      journalCountMap[j.teacherId] = (journalCountMap[j.teacherId] || 0) + 1;
    }

    // 7. Proses progres tiap guru
    const teacherResults: TeacherMonitoringItem[] = teachers.map((teacher) => {
      // Dapatkan penugasan mengajar, jika kosong buat fallback dari kolom lama
      let assignments = (teacher.teachingAssignments || []).map((a) => ({
        id: a.id,
        className: a.className.trim(),
        subject: a.subject.trim(),
        classLevel: a.classLevel || "",
        majorCode: a.majorCode || "",
      }));

      if (assignments.length === 0) {
        const legacySubjects = (teacher.mataPelajaran || "")
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const legacyLevels = (teacher.tingkatKelas || "")
          .split(/[,;\n]/)
          .map((l) => l.trim().toUpperCase())
          .filter(Boolean);
        const legacyMajors = (teacher.jurusan || "")
          .split(/[,;\n]/)
          .map((m) => m.trim().toUpperCase())
          .filter(Boolean);

        const matchedClasses = classMajors.filter(
          (cm) =>
            (legacyLevels.length === 0 || legacyLevels.includes(cm.grade.toUpperCase())) &&
            (legacyMajors.length === 0 || legacyMajors.includes(cm.majorCode.toUpperCase()))
        );

        assignments = matchedClasses.flatMap((cm) =>
          legacySubjects.map((subj) => ({
            id: `legacy-${cm.id}-${subj}`,
            className: cm.className.trim(),
            subject: subj,
            classLevel: cm.grade,
            majorCode: cm.majorCode,
          }))
        );
      }

      const teacherName = teacher.user?.name || teacher.kodeGuru;
      const nip = teacher.user?.nip || "-";
      const email = teacher.user?.email || "";

      let totalProgressSum = 0;
      let completedCount = 0;

      const assignmentDetails: AssignmentProgressItem[] = assignments.map((assignment) => {
        const clsName = assignment.className;
        const subjName = assignment.subject;
        const totalStudents = studentCountByClass[clsName] || 0;

        const key = `${teacher.id}__${clsName}__${subjName}`;
        const tpCount = tpCountMap.get(key) || 0;
        const gradeSets = gradeMap.get(key);

        const uhCount = gradeSets?.UH.size || 0;
        const tugasCount = gradeSets?.TUGAS.size || 0;
        const stsCount = gradeSets?.STS.size || 0;
        const sasCount = gradeSets?.SAS.size || 0;
        const sikapCount = gradeSets?.SIKAP.size || 0;

        // Hitung persentase pengerjaan tiap komponen
        const tpScore = tpCount > 0 ? 100 : 0;
        const uhScore =
          totalStudents > 0
            ? Math.min(100, Math.round((uhCount / totalStudents) * 100))
            : uhCount > 0
            ? 100
            : 0;
        const tugasScore =
          totalStudents > 0
            ? Math.min(100, Math.round((tugasCount / totalStudents) * 100))
            : tugasCount > 0
            ? 100
            : 0;
        const stsScore =
          totalStudents > 0
            ? Math.min(100, Math.round((stsCount / totalStudents) * 100))
            : stsCount > 0
            ? 100
            : 0;
        const sasScore =
          totalStudents > 0
            ? Math.min(100, Math.round((sasCount / totalStudents) * 100))
            : sasCount > 0
            ? 100
            : 0;
        const sikapScore =
          totalStudents > 0
            ? Math.min(100, Math.round((sikapCount / totalStudents) * 100))
            : sikapCount > 0
            ? 100
            : 0;

        // Rata-rata 6 komponen penilaian & administrasi
        const progress = Math.round(
          (tpScore + uhScore + tugasScore + stsScore + sasScore + sikapScore) / 6
        );

        const isComplete = progress >= 100;
        if (isComplete) completedCount++;
        totalProgressSum += progress;

        return {
          id: assignment.id,
          className: clsName,
          subject: subjName,
          classLevel: assignment.classLevel,
          majorCode: assignment.majorCode,
          totalStudents,
          tpCount,
          tpScore,
          uhCount,
          uhScore,
          tugasCount,
          tugasScore,
          stsCount,
          stsScore,
          sasCount,
          sasScore,
          sikapCount,
          sikapScore,
          progress,
          status: isComplete ? "SUDAH" : progress > 0 ? "PROSES" : "BELUM",
        };
      });

      const overallProgress =
        assignments.length > 0
          ? Math.round(totalProgressSum / assignments.length)
          : 0;

      let status: "SUDAH" | "PROSES" | "BELUM" = "BELUM";
      if (assignments.length > 0 && overallProgress >= 100) {
        status = "SUDAH";
      } else if (overallProgress > 0) {
        status = "PROSES";
      }

      return {
        id: teacher.id,
        kodeGuru: teacher.kodeGuru,
        name: teacherName,
        nip,
        email,
        totalAssignments: assignments.length,
        completedAssignments: completedCount,
        overallProgress,
        status,
        curriculumCount: curriculumCountMap[teacher.id] || 0,
        journalCount: journalCountMap[teacher.id] || 0,
        assignments: assignmentDetails,
      };
    });

    const summary = {
      totalTeachers: teacherResults.length,
      completedCount: teacherResults.filter((t) => t.status === "SUDAH").length,
      inProgressCount: teacherResults.filter((t) => t.status === "PROSES").length,
      notStartedCount: teacherResults.filter((t) => t.status === "BELUM").length,
      schoolAverage:
        teacherResults.length > 0
          ? Math.round(
              teacherResults.reduce((acc, t) => acc + t.overallProgress, 0) /
                teacherResults.length
            )
          : 0,
    };

    return NextResponse.json({
      academicYear,
      semester,
      semesterLabel,
      summary,
      teachers: teacherResults,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session tidak valid." }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Hanya admin yang boleh mengakses menu monitoring guru." },
        { status: 403 }
      );
    }
    console.error("Error in /api/monitoring-guru:", error);
    return NextResponse.json(
      { error: "Gagal memproses data monitoring guru" },
      { status: 500 }
    );
  }
}
