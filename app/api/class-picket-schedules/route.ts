import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/server-session";

const splitClassNames = (value?: string | null) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeClassNames = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : splitClassNames(String(value || ""));

const mapSchedule = (item: any) => ({
  id: item.id,
  teacherId: item.teacherId,
  teacherUserId: item.teacher?.userId || "",
  teacherName: item.teacher?.user?.name || "",
  teacherNip: item.teacher?.user?.nip || "",
  teacherKodeGuru: item.teacher?.kodeGuru || "",
  day: item.day,
  week: item.weekLabel,
  month: item.month,
  year: item.year,
  classes: splitClassNames(item.classNames),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);

    const schedules = await prisma.classPicketSchedule.findMany({
      where:
        session.role === "ADMIN"
          ? undefined
          : {
              teacher: {
                OR: [{ userId: session.uid }, session.nip ? { user: { nip: session.nip } } : undefined].filter(
                  Boolean
                ) as any[],
              },
            },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                nip: true,
              },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "asc" }, { weekLabel: "asc" }, { day: "asc" }],
    });

    return NextResponse.json(schedules.map(mapSchedule));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error fetching class picket schedules:", error);
    return NextResponse.json({ error: "Gagal mengambil jadwal piket kelas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const { teacherId, teacherIds, day, week, weeks, month, year, classes } = body;

    const normalizedClasses = normalizeClassNames(classes);
    if (!day || !month || !year || normalizedClasses.length === 0) {
      return NextResponse.json(
        { error: "Hari, bulan, tahun, dan kelas wajib diisi." },
        { status: 400 }
      );
    }

    // Resolve multiple teacher IDs
    const targetTeacherIds: string[] = [];
    if (Array.isArray(teacherIds)) {
      targetTeacherIds.push(...teacherIds.map(String).filter(Boolean));
    } else if (teacherId) {
      targetTeacherIds.push(String(teacherId));
    }

    if (targetTeacherIds.length === 0) {
      return NextResponse.json({ error: "Guru piket wajib dipilih." }, { status: 400 });
    }

    // Resolve multiple weeks
    const targetWeeks: string[] = [];
    if (Array.isArray(weeks)) {
      targetWeeks.push(...weeks.map(String).filter(Boolean));
    } else if (week) {
      targetWeeks.push(String(week));
    }

    if (targetWeeks.length === 0) {
      return NextResponse.json({ error: "Minggu wajib dipilih." }, { status: 400 });
    }

    // Verify all resolved teachers exist
    const teachers = await prisma.teacher.findMany({
      where: { id: { in: targetTeacherIds } },
    });

    if (teachers.length !== targetTeacherIds.length) {
      return NextResponse.json({ error: "Satu atau lebih guru piket tidak ditemukan." }, { status: 404 });
    }

    const createdSchedules: any[] = [];

    // Run batch insert in a transaction to guarantee consistency
    await prisma.$transaction(async (tx) => {
      for (const tId of targetTeacherIds) {
        for (const wLabel of targetWeeks) {
          // Check for duplication to prevent double assignments
          const exists = await tx.classPicketSchedule.findFirst({
            where: {
              teacherId: tId,
              day: String(day),
              weekLabel: String(wLabel),
              month: String(month),
              year: String(year),
            },
          });

          if (exists) {
            continue;
          }

          const created = await tx.classPicketSchedule.create({
            data: {
              teacherId: tId,
              day: String(day),
              weekLabel: String(wLabel),
              month: String(month),
              year: String(year),
              classNames: normalizedClasses.join(","),
            },
            include: {
              teacher: {
                include: {
                  user: {
                    select: {
                      name: true,
                      nip: true,
                    },
                  },
                },
              },
            },
          });
          createdSchedules.push(created);
        }
      }
    });

    if (createdSchedules.length > 0) {
      return NextResponse.json(mapSchedule(createdSchedules[0]), { status: 201 });
    }
    
    // Fallback if all slots already existed
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal piket kelas." }, { status: 403 });
    }
    console.error("Error creating class picket schedule:", error);
    return NextResponse.json({ error: "Gagal membuat jadwal piket kelas." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const { id, teacherId, day, week, month, year, classes } = body;

    const normalizedClasses = normalizeClassNames(classes);
    if (!id || !teacherId || !day || !week || !month || !year || normalizedClasses.length === 0) {
      return NextResponse.json(
        { error: "ID, guru, hari, minggu, bulan, tahun, dan kelas wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await prisma.classPicketSchedule.findUnique({
      where: { id: String(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Jadwal piket kelas tidak ditemukan." }, { status: 404 });
    }

    const updated = await prisma.classPicketSchedule.update({
      where: { id: String(id) },
      data: {
        teacherId: String(teacherId),
        day: String(day),
        weekLabel: String(week),
        month: String(month),
        year: String(year),
        classNames: normalizedClasses.join(","),
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                nip: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(mapSchedule(updated));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal piket kelas." }, { status: 403 });
    }
    console.error("Error updating class picket schedule:", error);
    return NextResponse.json({ error: "Gagal memperbarui jadwal piket kelas." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID jadwal wajib diisi." }, { status: 400 });
    }

    await prisma.classPicketSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal piket kelas." }, { status: 403 });
    }
    console.error("Error deleting class picket schedule:", error);
    return NextResponse.json({ error: "Gagal menghapus jadwal piket kelas." }, { status: 500 });
  }
}
