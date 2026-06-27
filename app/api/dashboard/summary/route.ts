import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDefaultGradePeriod } from "@/lib/grade-period";
import { requireRole } from "@/lib/server-session";

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const defaultPeriod = getDefaultGradePeriod();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [curriculumCount, journalsToday, teacherCount, schedulesThisSemester, recentJournals, recentGrades] =
      await Promise.all([
        prisma.curriculum.count({
          where: {
            semester: defaultPeriod.term,
            academicYear: defaultPeriod.academicYear,
          },
        }),
        prisma.journal.count({
          where: {
            date: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        }),
        prisma.teacher.count(),
        prisma.schedule.count({
          where: {
            semester: defaultPeriod.term,
            academicYear: defaultPeriod.academicYear,
          },
        }),
        prisma.journal.findMany({
          take: 4,
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          include: {
            teacher: {
              include: { user: true },
            },
          },
        }),
        prisma.grade.findMany({
          take: 4,
          orderBy: { updatedAt: "desc" },
          include: {
            teacher: {
              include: { user: true },
            },
          },
        }),
      ]);

    const activities = [
      ...recentJournals.map((journal) => ({
        id: journal.id,
        sortTime: journal.createdAt.getTime(),
        time: new Date(journal.createdAt).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        teacher: journal.teacher.user.name,
        action: "Mengisi jurnal mengajar",
        subject: journal.subject,
        status: journal.verifyStatus === "SUDAH" ? "success" : "pending",
      })),
      ...recentGrades.map((grade) => ({
        id: grade.id,
        sortTime: grade.updatedAt.getTime(),
        time: new Date(grade.updatedAt).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        teacher: grade.teacher.user.name,
        action: `Mengisi nilai ${grade.jenisPenilaian}`,
        subject: grade.subject,
        status: "success",
      })),
    ]
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 6)
      .map(({ sortTime, ...activity }) => activity);

    return NextResponse.json({
      stats: {
        curriculumCount,
        journalsToday,
        teacherCount,
        schedulesThisSemester,
      },
      period: defaultPeriod,
      activities,
      integrations: [
        {
          name: "Database PostgreSQL",
          description: "Data inti aplikasi tersimpan di server",
          status: "success",
        },
        {
          name: "Session Server-Side",
          description: "Autorisasi API memakai cookie session httpOnly",
          status: "success",
        },
        {
          name: "Sinkronisasi Nilai",
          description: "Nilai, guru, dan kelas membaca sumber data yang sama",
          status: "success",
        },
      ],
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh melihat dashboard." }, { status: 403 });
    }
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json({ error: "Gagal memuat ringkasan dashboard." }, { status: 500 });
  }
}
