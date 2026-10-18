import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { type SemesterTerm } from "@/lib/grade-period";
import { requireSession } from "@/lib/server-session";
import {
  buildCompetenceNote,
  buildSemesterReportLabel,
  calculateFinalScore,
  canAccessReportClass,
  getPhaseFromClassLevel,
  getReportGroup,
  isBKSubject,
  isMatchingGrade,
  matchesReportMajorCode,
  resolveReportViewerAccess,
  sortReportSubjects,
  sortSubjects,
} from "@/lib/report-card";
import { getReportProfile } from "@/lib/report-profiles";

type ReportGradeType = "UH" | "TUGAS" | "STS" | "SAS" | "SIKAP";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const viewer = await resolveReportViewerAccess(session);
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester") as SemesterTerm | null;
    const reportMajorCode = searchParams.get("reportMajorCode");
    const reportVariant = searchParams.get("reportVariant") as "STS" | "SAS" | null;
    const reportProfile = getReportProfile(reportMajorCode);

    if (!viewer) {
      return NextResponse.json(
        { error: "Guru aktif pada session tidak ditemukan di database admin." },
        { status: 403 }
      );
    }

    if (viewer.role === "TEACHER" && !viewer.isHomeroomTeacher) {
      return NextResponse.json(
        { error: "Menu Cetak Raport hanya dapat diakses oleh admin atau guru yang menjadi wali kelas." },
        { status: 403 }
      );
    }

    if (!studentId || !academicYear || !semester) {
      return NextResponse.json(
        { error: "Siswa, tahun ajaran, dan semester wajib dipilih." },
        { status: 400 }
      );
    }

    if (!["Ganjil", "Genap"].includes(semester)) {
      return NextResponse.json(
        { error: "Semester tidak valid." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
    }

    if (!canAccessReportClass(viewer, student.className)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke raport siswa pada kelas tersebut." },
        { status: 403 }
      );
    }

    const classMajor = student.className
      ? await prisma.classMajor.findFirst({
          where: { className: student.className },
          include: {
            homeroomTeacherProfile: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })
      : null;

    if (
      reportProfile &&
      !matchesReportMajorCode(reportProfile.majorCode, {
        className: student.className,
        majorCode: classMajor?.majorCode,
        majorName: classMajor?.majorName,
      })
    ) {
      return NextResponse.json(
        {
          error: `Siswa pada kelas ${student.className || "-"} tidak termasuk jalur raport ${reportProfile.majorCode}.`,
        },
        { status: 400 }
      );
    }

    const semesterLabel = buildSemesterReportLabel(semester, academicYear);
    const supplement = await prisma.reportCardSupplement.findUnique({
      where: {
        studentId_academicYear_semester: {
          studentId,
          academicYear,
          semester,
        },
      },
    });
    const classLocationSupplement = student.className
      ? await prisma.reportCardSupplement.findFirst({
          where: {
            className: student.className,
            academicYear,
            semester,
          },
          orderBy: [{ updatedAt: "desc" }],
        })
      : null;

    // 1. Fetch subjects directly from database Subject table
    const dbSubjects = await prisma.subject.findMany({
      orderBy: { createdAt: "asc" },
    });

    // 2. Exclude BK (Bimbingan Konseling) from report card
    const reportDbSubjects = dbSubjects.filter((s) => !isBKSubject(s));

    // 3. Sort subjects according to curriculum standard (Group A first, then Group B)
    const sortedDbSubjects = sortReportSubjects(reportDbSubjects);

    // 4. Fetch grades for student in this semester
    const grades = await prisma.grade.findMany({
      where: {
        studentId,
        semester: semesterLabel,
      },
      orderBy: [{ subject: "asc" }, { jenisPenilaian: "asc" }],
    });

    // Filter out any BK grades from student grades
    const nonBKGrades = grades.filter((g) => !isBKSubject(g.subject));

    // 5. Build subject list:
    // Primary list comes from database subjects.
    // If student has grades in nonBKGrades for a subject not currently in database,
    // also include it so teacher input is never lost.
    const subjectList: Array<{ code: string; name: string }> = sortedDbSubjects.map((s) => ({
      code: s.code,
      name: s.name,
    }));

    const extraSubjects = new Map<string, { code: string; name: string }>();
    nonBKGrades.forEach((g) => {
      const matchesAny = subjectList.some((s) => isMatchingGrade(g.subject, s));
      if (!matchesAny && !extraSubjects.has(g.subject)) {
        extraSubjects.set(g.subject, {
          code: "",
          name: g.subject,
        });
      }
    });

    if (extraSubjects.size > 0) {
      const sortedExtras = sortReportSubjects(Array.from(extraSubjects.values()));
      subjectList.push(...sortedExtras);
    }

    // 6. Map grades to subjects
    const subjectGradesMap = new Map<string, typeof nonBKGrades>();
    subjectList.forEach((subject) => {
      const matched = nonBKGrades.filter((g) => isMatchingGrade(g.subject, subject));
      subjectGradesMap.set(subject.name, matched);
    });

    // 7. Teaching objectives lookup
    const objectiveFilters = subjectList
      .map((subject) => {
        const gradesForSub = subjectGradesMap.get(subject.name) ?? [];
        const teacherId = gradesForSub.find((item) => item.teacherId)?.teacherId;
        if (!teacherId || !student.className) return null;

        const possibleNames = Array.from(new Set([subject.name, ...gradesForSub.map((g) => g.subject)]));
        return possibleNames.map((name) => ({
          teacherId,
          subject: name,
          className: student.className!,
          academicYear,
          semester,
        }));
      })
      .filter((items): items is Array<{
        teacherId: string;
        subject: string;
        className: string;
        academicYear: string;
        semester: SemesterTerm;
      }> => items !== null)
      .flat();

    const teachingObjectives = objectiveFilters.length
      ? await prisma.teachingObjective.findMany({
          where: {
            OR: objectiveFilters,
          },
          orderBy: [{ subject: "asc" }, { orderNo: "asc" }],
        })
      : [];

    const objectivesBySubject = teachingObjectives.reduce((map, item) => {
      const targetSub = subjectList.find((s) => isMatchingGrade(item.subject, s));
      const key = targetSub ? targetSub.name : item.subject;
      const objectives = map.get(key) ?? [];
      objectives.push(item.objectiveText);
      map.set(key, objectives);
      return map;
    }, new Map<string, string[]>());

    // 8. Build rows
    const rows = subjectList.map((subject, index) => {
      const subjectGrades = subjectGradesMap.get(subject.name) ?? [];
      const score = calculateFinalScore(
        subjectGrades as Array<{
          subject: string;
          jenisPenilaian: "UH" | "TUGAS" | "STS" | "SAS" | "SIKAP";
          nilai1: string | null;
          nilai2: string | null;
          nilai3: string | null;
          nilaiAkhir: string | null;
        }>,
        reportVariant ?? "SAS"
      );
      const group = getReportGroup(subject.name, subject.code);

      return {
        no: index + 1,
        groupCode: group.code,
        groupName: group.name,
        subjectName: subject.name,
        uhAverage: score.uhAverage,
        tugasAverage: score.tugasAverage,
        stsScore: score.stsScore,
        sasScore: score.sasScore,
        finalScore: score.finalScore,
        roundedScore: score.roundedScore,
        sikapScore: score.sikapScore,
        competenceNote: buildCompetenceNote(
          subject.name,
          score.finalScore,
          objectivesBySubject.get(subject.name) ?? []
        ),
        isComplete: score.finalScore !== null,
      };
    });

    const groupedRows = rows.reduce<Array<{ code: string; name: string; items: typeof rows }>>(
      (groups, row) => {
        const existing = groups.find((group) => group.code === row.groupCode);
        if (existing) {
          existing.items.push(row);
          return groups;
        }

        groups.push({
          code: row.groupCode,
          name: row.groupName,
          items: [row],
        });
        return groups;
      },
      []
    );

    const numericScores = rows
      .map((row) => row.roundedScore)
      .filter((value): value is number => typeof value === "number");
    const totalScore = numericScores.reduce((sum, value) => sum + value, 0);
    const averageScore =
      numericScores.length > 0 ? Math.round((totalScore / numericScores.length) * 100) / 100 : null;

    return NextResponse.json({
      filter: {
        academicYear,
        semester,
        semesterLabel,
      },
      student: {
        id: student.id,
        name: student.name,
        nis: student.nis || "-",
        nisn: student.nisn || "-",
        className: student.className || "-",
        phase: getPhaseFromClassLevel(classMajor?.grade || student.className?.split(" ")[0] || null),
      },
      classInfo: {
        classLevel: classMajor?.grade || student.className?.split(" ")[0] || "-",
        majorCode: classMajor?.majorCode || student.className?.split(" ")[1] || "-",
        majorName: classMajor?.majorName || "-",
        bidangKeahlian: reportProfile?.bidangKeahlian || "-",
        programKeahlian: reportProfile?.programKeahlian || classMajor?.majorName || "-",
        konsentrasiKeahlian:
          reportProfile?.konsentrasiKeahlian || classMajor?.majorName || classMajor?.majorCode || "-",
        homeroomTeacher:
          classMajor?.homeroomTeacherProfile?.user?.name || classMajor?.homeroomTeacher || "-",
      },
      schoolInfo: {
        name: "SMKS PACET",
        title: `Laporan Hasil Belajar Siswa Sumatif Akhir Semester ${semester.toUpperCase()}`,
        academicYearTitle: `Tahun Pelajaran ${academicYear}`,
      },
      summary: {
        totalScore,
        averageScore,
        completedSubjects: rows.filter((row) => row.isComplete).length,
        totalSubjects: rows.length,
      },
      groupedRows,
      notes: {
        attendance: {
          sakit: supplement?.sakit ?? 0,
          izin: supplement?.izin ?? 0,
          alpha: supplement?.alpha ?? 0,
        },
        personality: [
          { aspect: "Akhlak", value: supplement?.personalityAkhlak ?? "-" },
          { aspect: "Kerajinan", value: supplement?.personalityKerajinan ?? "-" },
          { aspect: "Kerapian", value: supplement?.personalityKerapian ?? "-" },
        ],
        development: [
          { activity: "Pramuka", value: supplement?.developmentPramuka ?? "-" },
          { activity: "Sholat Dhuha", value: supplement?.developmentSholatDhuha ?? "-" },
        ],
        homeroomNote:
          supplement?.homeroomNote ||
          (rows.length === 0
            ? "Belum ada data nilai untuk semester ini."
            : "Lengkapi absensi, kepribadian, pengembangan diri, dan catatan wali untuk menyempurnakan raport."),
        location: {
          city: supplement?.reportCity || classLocationSupplement?.reportCity || "Pacet",
          date: supplement?.reportDate || classLocationSupplement?.reportDate || "",
        },
        signatures: {
          homeroom: {
            name:
              supplement?.homeroomSignatureName ||
              classMajor?.homeroomTeacherProfile?.user?.name ||
              classMajor?.homeroomTeacher ||
              "",
            title: supplement?.homeroomSignatureTitle || "Wali Kelas",
          },
          principal: {
            name: supplement?.principalSignatureName || "Kepala SMKS PACET",
            title: supplement?.principalSignatureTitle || "Kepala Sekolah",
            nip: supplement?.principalNip ?? "",
          },
        },
        finalization: {
          isFinalized: supplement?.isFinalized ?? false,
          finalizedAt: supplement?.finalizedAt?.toISOString() ?? null,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    console.error("Error generating report card preview:", error);
    return NextResponse.json(
      { error: "Gagal memuat preview raport." },
      { status: 500 }
    );
  }
}
