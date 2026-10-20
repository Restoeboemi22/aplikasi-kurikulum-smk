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
  isExcludedFromReport,
  isMatchingGrade,
  matchesReportMajorCode,
  resolveReportViewerAccess,
  sortReportSubjects,
} from "@/lib/report-card";
import { getReportProfile } from "@/lib/report-profiles";
import { extractClassLevel, isSubjectActiveInLevel } from "@/lib/subject-groups";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const viewer = await resolveReportViewerAccess(session);
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("className");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester") as SemesterTerm | null;
    const reportMajorCode = searchParams.get("reportMajorCode");
    const reportVariant = (searchParams.get("reportVariant") as "STS" | "SAS") || "STS";
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

    if (!className || !academicYear || !semester) {
      return NextResponse.json(
        { error: "Kelas, tahun ajaran, dan semester wajib dipilih." },
        { status: 400 }
      );
    }

    if (!["Ganjil", "Genap"].includes(semester)) {
      return NextResponse.json(
        { error: "Semester tidak valid." },
        { status: 400 }
      );
    }

    if (!canAccessReportClass(viewer, className)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke raport siswa pada kelas tersebut." },
        { status: 403 }
      );
    }

    const classMajor = await prisma.classMajor.findFirst({
      where: { className },
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
    });

    if (
      reportProfile &&
      !matchesReportMajorCode(reportProfile.majorCode, {
        className,
        majorCode: classMajor?.majorCode,
        majorName: classMajor?.majorName,
      })
    ) {
      return NextResponse.json(
        {
          error: `Kelas ${className} tidak termasuk jalur raport ${reportProfile.majorCode}.`,
        },
        { status: 400 }
      );
    }

    // Ambil seluruh siswa di kelas ini
    const students = await prisma.student.findMany({
      where: { className },
      orderBy: [{ name: "asc" }],
    });

    if (students.length === 0) {
      return NextResponse.json({
        className,
        academicYear,
        semester,
        totalStudents: 0,
        previews: [],
      });
    }

    const studentIds = students.map((s) => s.id);
    const semesterLabel = buildSemesterReportLabel(semester, academicYear);

    // Ambil data pendukung pengesahan kelas & sekolah
    const classLocationSupplement = await prisma.reportCardSupplement.findFirst({
      where: {
        className,
        academicYear,
        semester,
        OR: [
          { reportDate: { not: "" } },
          { homeroomSignatureName: { not: "" } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    const schoolSupplement = await prisma.reportCardSupplement.findFirst({
      where: {
        academicYear,
        semester,
        OR: [
          { principalSignatureName: { not: "" } },
          { reportDate: { not: "" } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    // Ambil seluruh supplement siswa di kelas ini
    const allSupplements = await prisma.reportCardSupplement.findMany({
      where: {
        studentId: { in: studentIds },
        academicYear,
        semester,
      },
    });
    const supplementMap = new Map(allSupplements.map((s) => [s.studentId, s]));

    // Ambil daftar mata pelajaran dari DB
    const dbSubjects = await prisma.subject.findMany({
      orderBy: { createdAt: "asc" },
    });

    const studentClassLevel = (classMajor?.grade || extractClassLevel(className)) as string | null;
    const reportDbSubjects = dbSubjects.filter((s) => {
      if (isExcludedFromReport(s)) return false;
      if (!studentClassLevel) return true;
      return isSubjectActiveInLevel(s.levels, studentClassLevel);
    });
    const sortedDbSubjects = sortReportSubjects(reportDbSubjects);

    // Ambil seluruh nilai siswa di kelas ini untuk semester ini
    const allGrades = await prisma.grade.findMany({
      where: {
        studentId: { in: studentIds },
        semester: semesterLabel,
      },
      orderBy: [{ subject: "asc" }, { jenisPenilaian: "asc" }],
    });

    // Kelompokkan nilai per siswa
    const gradesByStudent = new Map<string, typeof allGrades>();
    allGrades.forEach((g) => {
      if (isExcludedFromReport(g.subject)) return;
      const list = gradesByStudent.get(g.studentId) || [];
      list.push(g);
      gradesByStudent.set(g.studentId, list);
    });

    // Ambil seluruh TP (Teaching Objectives) untuk kelas ini
    const teachingObjectives = await prisma.teachingObjective.findMany({
      where: {
        className,
        academicYear,
        semester,
      },
      orderBy: [{ subject: "asc" }, { orderNo: "asc" }],
    });

    const baseSubjectList = sortedDbSubjects.map((s) => ({
      code: s.code,
      name: s.name,
    }));

    // Generate preview untuk setiap siswa
    const previews = students.map((student) => {
      const studentGrades = gradesByStudent.get(student.id) || [];
      const supplement = supplementMap.get(student.id);

      // Kumpulkan mapel untuk siswa ini
      const subjectList = [...baseSubjectList];
      const extraSubjects = new Map<string, { code: string; name: string }>();
      studentGrades.forEach((g) => {
        if (isExcludedFromReport(g.subject)) return;
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

      // Map nilai ke subject
      const subjectGradesMap = new Map<string, typeof studentGrades>();
      subjectList.forEach((subject) => {
        const matched = studentGrades.filter((g) => isMatchingGrade(g.subject, subject));
        subjectGradesMap.set(subject.name, matched);
      });

      // Objectives by subject with teacher prioritization
      const objectivesBySubject = new Map<string, string[]>();
      subjectList.forEach((subject) => {
        const gradesForSub = subjectGradesMap.get(subject.name) ?? [];
        const teacherIdsInGrades = new Set(gradesForSub.map((g) => g.teacherId).filter(Boolean));
        const matchingTps = teachingObjectives.filter((tp) => isMatchingGrade(tp.subject, subject));
        const teacherMatchedTps = matchingTps.filter((tp) => teacherIdsInGrades.has(tp.teacherId));
        const finalTps = teacherMatchedTps.length > 0 ? teacherMatchedTps : matchingTps;
        objectivesBySubject.set(subject.name, finalTps.map((t) => t.objectiveText));
      });

      // Bangun baris nilai
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
          reportVariant
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

      groupedRows.sort((a, b) => a.code.localeCompare(b.code));
      groupedRows.forEach((group) => {
        group.items.forEach((item, itemIdx) => {
          item.no = itemIdx + 1;
        });
      });

      const numericScores = rows
        .map((row) => row.roundedScore)
        .filter((value): value is number => typeof value === "number");
      const totalScore = numericScores.reduce((sum, value) => sum + value, 0);
      const averageScore =
        numericScores.length > 0 ? Math.round((totalScore / numericScores.length) * 100) / 100 : null;

      return {
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
          title:
            reportVariant === "SAS"
              ? `Laporan Hasil Belajar Siswa Sumatif Akhir Semester ${semester.toUpperCase()}`
              : `Laporan Hasil Belajar Siswa Sumatif Tengah Semester ${semester.toUpperCase()}`,
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
            city:
              supplement?.reportCity ||
              classLocationSupplement?.reportCity ||
              schoolSupplement?.reportCity ||
              "Pacet",
            date:
              supplement?.reportDate ||
              classLocationSupplement?.reportDate ||
              schoolSupplement?.reportDate ||
              "",
          },
          signatures: {
            homeroom: {
              name:
                supplement?.homeroomSignatureName ||
                classLocationSupplement?.homeroomSignatureName ||
                classMajor?.homeroomTeacherProfile?.user?.name ||
                classMajor?.homeroomTeacher ||
                "",
              title:
                supplement?.homeroomSignatureTitle ||
                classLocationSupplement?.homeroomSignatureTitle ||
                "Wali Kelas",
            },
            principal: {
              name:
                supplement?.principalSignatureName ||
                classLocationSupplement?.principalSignatureName ||
                schoolSupplement?.principalSignatureName ||
                "Moh. Junaedi Hartanto, S.Pd",
              title:
                supplement?.principalSignatureTitle ||
                classLocationSupplement?.principalSignatureTitle ||
                schoolSupplement?.principalSignatureTitle ||
                "Kepala Sekolah",
              nip:
                supplement?.principalNip ??
                classLocationSupplement?.principalNip ??
                schoolSupplement?.principalNip ??
                "",
            },
          },
          finalization: {
            isFinalized: supplement?.isFinalized ?? false,
            finalizedAt: supplement?.finalizedAt?.toISOString() ?? null,
          },
        },
      };
    });

    return NextResponse.json({
      className,
      academicYear,
      semester,
      totalStudents: students.length,
      previews,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    console.error("Error generating batch report card preview:", error);
    return NextResponse.json(
      { error: "Gagal memuat batch preview raport." },
      { status: 500 }
    );
  }
}
