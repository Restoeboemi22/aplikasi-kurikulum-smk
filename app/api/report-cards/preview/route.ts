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
  matchesReportMajorCode,
  resolveReportViewerAccess,
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

    const grades = await prisma.grade.findMany({
      where: {
        studentId,
        semester: semesterLabel,
      },
      orderBy: [{ subject: "asc" }, { jenisPenilaian: "asc" }],
    });

    const gradeMap = new Map<string, typeof grades>();
    grades.forEach((grade) => {
      const list = gradeMap.get(grade.subject) ?? [];
      list.push(grade as typeof grades[number] & { jenisPenilaian: ReportGradeType });
      gradeMap.set(grade.subject, list);
    });

    const subjectNames = sortSubjects(Array.from(gradeMap.keys()));
    const objectiveFilters = subjectNames
      .map((subjectName) => {
        const teacherId = (gradeMap.get(subjectName) ?? []).find((item) => item.teacherId)?.teacherId;
        if (!teacherId || !student.className) return null;

        return {
          teacherId,
          subject: subjectName,
          className: student.className,
          academicYear,
          semester,
        };
      })
      .filter(
        (
          value
        ): value is {
          teacherId: string;
          subject: string;
          className: string;
          academicYear: string;
          semester: SemesterTerm;
        } => value !== null
      );

    const teachingObjectives = objectiveFilters.length
      ? await prisma.teachingObjective.findMany({
          where: {
            OR: objectiveFilters,
          },
          orderBy: [{ subject: "asc" }, { orderNo: "asc" }],
        })
      : [];

    const objectivesBySubject = teachingObjectives.reduce((map, item) => {
      const objectives = map.get(item.subject) ?? [];
      objectives.push(item.objectiveText);
      map.set(item.subject, objectives);
      return map;
    }, new Map<string, string[]>());

    const rows = subjectNames.map((subjectName, index) => {
      const subjectGrades = gradeMap.get(subjectName) ?? [];
      const score = calculateFinalScore(subjectGrades, reportVariant ?? "SAS");
      const group = getReportGroup(subjectName);

      return {
        no: index + 1,
        groupCode: group.code,
        groupName: group.name,
        subjectName,
        uhAverage: score.uhAverage,
        tugasAverage: score.tugasAverage,
        stsScore: score.stsScore,
        sasScore: score.sasScore,
        finalScore: score.finalScore,
        roundedScore: score.roundedScore,
        sikapScore: score.sikapScore,
        competenceNote: buildCompetenceNote(
          subjectName,
          score.finalScore,
          objectivesBySubject.get(subjectName) ?? []
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
        nis: student.nis,
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
          city: supplement?.reportCity ?? "Pacet",
          date: supplement?.reportDate ?? "",
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
