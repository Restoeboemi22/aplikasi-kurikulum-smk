import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildSemesterLabel, type SemesterTerm } from "@/lib/grade-period";
import { calculateFinalScore } from "@/lib/report-card";
import { requireRole } from "@/lib/server-session";
import {
  calculateAverage,
  calculateMinimum,
  calculateNspScore,
  calculateTotal,
  DKN_CRITERIA,
  DKN_SUBJECTS,
  determineDknStatus,
  getDKNConcentration,
  normalizeGenderLabel,
} from "@/lib/dkn";

type DknGradeType = "UH" | "TUGAS" | "STS" | "SAS" | "SIKAP";

type ScoreMap = Record<string, number | null>;

type GradeRecord = {
  subject: string;
  jenisPenilaian: DknGradeType;
  nilai1: string | null;
  nilai2: string | null;
  nilai3: string | null;
  nilaiAkhir: string | null;
};

function roundTwo(value: number | null) {
  if (value === null) return null;
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const className = searchParams.get("className");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester") as SemesterTerm | null;

    if (!className || !academicYear || !semester) {
      return NextResponse.json(
        { error: "Kelas, tahun ajaran, dan semester wajib dipilih." },
        { status: 400 }
      );
    }

    if (!["Ganjil", "Genap"].includes(semester)) {
      return NextResponse.json({ error: "Semester tidak valid." }, { status: 400 });
    }

    const classInfo = await prisma.classMajor.findFirst({
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

    if (!classInfo) {
      return NextResponse.json({ error: "Data kelas tidak ditemukan." }, { status: 404 });
    }

    const semesterLabel = buildSemesterLabel(semester, academicYear);
    const students = await prisma.student.findMany({
      where: { className },
      orderBy: [{ nis: "asc" }, { name: "asc" }],
    });

    const studentIds = students.map((student) => student.id);

    const grades = studentIds.length
      ? await prisma.grade.findMany({
          where: {
            studentId: {
              in: studentIds,
            },
            semester: semesterLabel,
          },
          orderBy: [{ studentId: "asc" }, { subject: "asc" }],
        })
      : [];

    const gradeMap = grades.reduce((map, grade) => {
      const key = `${grade.studentId}::${grade.subject}`;
      const list = map.get(key) ?? [];
      list.push({
        subject: grade.subject,
        jenisPenilaian: grade.jenisPenilaian as DknGradeType,
        nilai1: grade.nilai1,
        nilai2: grade.nilai2,
        nilai3: grade.nilai3,
        nilaiAkhir: grade.nilaiAkhir,
      });
      map.set(key, list);
      return map;
    }, new Map<string, GradeRecord[]>());

    const rows = students.map((student, index) => {
      const rrScores: ScoreMap = {};
      const psajScores: ScoreMap = {};
      const nspScores: ScoreMap = {};
      const characterScores: string[] = [];

      DKN_SUBJECTS.forEach((subject) => {
        const records = gradeMap.get(`${student.id}::${subject.name}`) ?? [];
        const summary = calculateFinalScore(records);

        rrScores[subject.name] = summary.finalScore === null ? null : roundTwo(summary.finalScore);
        psajScores[subject.name] = summary.sasScore === null ? null : roundTwo(summary.sasScore);
        nspScores[subject.name] = calculateNspScore(rrScores[subject.name], psajScores[subject.name]);

        if (summary.sikapScore) {
          characterScores.push(summary.sikapScore);
        }
      });

      const rrValues = DKN_SUBJECTS.map((subject) => rrScores[subject.name]);
      const psajValues = DKN_SUBJECTS.map((subject) => psajScores[subject.name]);
      const nspValues = DKN_SUBJECTS.map((subject) => nspScores[subject.name]);

      const reportAverage = calculateAverage(rrValues);
      const psajAverage = calculateAverage(psajValues);
      const nspAverage = calculateAverage(nspValues);
      const psajMinimum = calculateMinimum(psajValues);
      const psajTotal = calculateTotal(psajValues);
      const status = determineDknStatus({
        reportAverage,
        psajMinimum,
        nspAverage,
      });

      return {
        no: index + 1,
        studentId: student.id,
        nis: student.nis,
        nisn: student.nisn || "-",
        name: student.name,
        gender: normalizeGenderLabel(student.gender),
        rr: {
          label: "RR",
          scores: rrScores,
          average: reportAverage,
        },
        psaj: {
          label: "PSAJ",
          scores: psajScores,
          total: psajTotal,
          average: psajAverage,
          minimum: psajMinimum,
        },
        nsp: {
          label: "NSP",
          scores: nspScores,
          average: nspAverage,
          characterValue: characterScores[0] || "-",
          status,
        },
      };
    });

    return NextResponse.json({
      filter: {
        academicYear,
        semester,
        semesterLabel,
      },
      schoolInfo: {
        title: "DAFTAR KUMPULAN NILAI SEKOLAH TINGKAT SMK",
        schoolYearTitle: `TAHUN PELAJARAN ${academicYear}`,
        city: "Kabupaten Mojokerto",
        schoolName: "SMKS PACET",
        schoolAddress: "Jl. Raya Pacet-Trawas No. 21, Ds. Pacet, Kec. Pacet, Kab. Mojokerto",
      },
      criteria: {
        reportWeightPercent: DKN_CRITERIA.reportWeightPercent,
        psajWeightPercent: DKN_CRITERIA.psajWeightPercent,
        minimumReportAverage: DKN_CRITERIA.minimumReportAverage,
        minimumPsajScore: DKN_CRITERIA.minimumPsajScore,
        minimumNspAverage: DKN_CRITERIA.minimumNspAverage,
      },
      classInfo: {
        className: classInfo.className,
        grade: classInfo.grade,
        majorCode: classInfo.majorCode,
        majorName: classInfo.majorName || "-",
        room: classInfo.room || "-",
        homeroomTeacher:
          classInfo.homeroomTeacherProfile?.user?.name || classInfo.homeroomTeacher || "-",
        concentration: getDKNConcentration(classInfo.majorCode, classInfo.majorName),
      },
      subjects: DKN_SUBJECTS,
      rows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Hanya admin yang boleh mengakses Cetak DKN." },
        { status: 403 }
      );
    }

    console.error("Error generating DKN preview:", error);
    return NextResponse.json({ error: "Gagal memuat preview DKN." }, { status: 500 });
  }
}
