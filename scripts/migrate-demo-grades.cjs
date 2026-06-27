const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const splitCsv = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isDemoGrade = (grade) =>
  grade.teacher?.kodeGuru === "GRU-DEMO" || grade.user?.email === "demo@guru.smk";

async function main() {
  if (!process.env.POSTGRES_PRISMA_URL) {
    console.log(
      JSON.stringify(
        {
          skipped: true,
          reason: "POSTGRES_PRISMA_URL tidak tersedia di environment ini.",
        },
        null,
        2
      )
    );
    return;
  }

  const teachers = await prisma.teacher.findMany({
    include: { user: true },
  });

  const demoGrades = await prisma.grade.findMany({
    where: {
      OR: [
        { teacher: { kodeGuru: "GRU-DEMO" } },
        { user: { email: "demo@guru.smk" } },
      ],
    },
    include: {
      teacher: { include: { user: true } },
      user: true,
      student: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    total: demoGrades.length,
    migrated: 0,
    skipped: 0,
    skippedItems: [],
  };

  for (const grade of demoGrades) {
    if (!isDemoGrade(grade)) continue;

    const classCandidates = teachers.filter((teacher) => {
      if (teacher.user.role !== "TEACHER") return false;
      return (
        splitCsv(teacher.tingkatKelas).includes(grade.classLevel) &&
        splitCsv(teacher.jurusan).includes(grade.major)
      );
    });

    const exactSubjectCandidates =
      grade.subject && grade.subject !== "Umum"
        ? classCandidates.filter((teacher) =>
            splitCsv(teacher.mataPelajaran).includes(grade.subject)
          )
        : [];

    const candidates =
      exactSubjectCandidates.length > 0 ? exactSubjectCandidates : classCandidates;

    if (candidates.length !== 1) {
      summary.skipped += 1;
      summary.skippedItems.push({
        gradeId: grade.id,
        student: grade.student?.name,
        subject: grade.subject,
        classLevel: grade.classLevel,
        major: grade.major,
        reason:
          candidates.length === 0
            ? "Tidak ada guru yang cocok."
            : `Ambigu: ${candidates.length} guru cocok.`,
      });
      continue;
    }

    const targetTeacher = candidates[0];
    const teacherSubjects = splitCsv(targetTeacher.mataPelajaran);
    const resolvedSubject =
      grade.subject && grade.subject !== "Umum"
        ? grade.subject
        : teacherSubjects.length === 1
          ? teacherSubjects[0]
          : null;

    if (!resolvedSubject) {
      summary.skipped += 1;
      summary.skippedItems.push({
        gradeId: grade.id,
        student: grade.student?.name,
        subject: grade.subject,
        classLevel: grade.classLevel,
        major: grade.major,
        reason: "Mapel lama tidak spesifik dan guru memiliki lebih dari satu mapel.",
      });
      continue;
    }

    await prisma.grade.update({
      where: { id: grade.id },
      data: {
        teacherId: targetTeacher.id,
        userId: targetTeacher.userId,
        subject: resolvedSubject,
      },
    });

    summary.migrated += 1;
  }

  const remainingDemoGrades = await prisma.grade.count({
    where: {
      OR: [
        { teacher: { kodeGuru: "GRU-DEMO" } },
        { user: { email: "demo@guru.smk" } },
      ],
    },
  });

  if (remainingDemoGrades === 0) {
    const demoTeacher = await prisma.teacher.findFirst({
      where: { kodeGuru: "GRU-DEMO" },
      include: { user: true },
    });

    if (demoTeacher) {
      await prisma.teacher.delete({ where: { id: demoTeacher.id } });
      await prisma.user.delete({ where: { id: demoTeacher.userId } });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
