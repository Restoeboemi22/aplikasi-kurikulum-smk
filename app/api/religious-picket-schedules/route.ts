import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/server-session";

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
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);

    const schedules = await prisma.religiousPicketSchedule.findMany({
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
    console.error("Error fetching religious picket schedules:", error);
    return NextResponse.json({ error: "Gagal mengambil jadwal piket keagamaan." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const { teacherId, day, week, month, year } = body;

    if (!teacherId || !day || !week || !month || !year) {
      return NextResponse.json(
        { error: "Guru, hari, minggu, bulan, dan tahun wajib diisi." },
        { status: 400 }
      );
    }

    const created = await prisma.religiousPicketSchedule.create({
      data: {
        teacherId: String(teacherId),
        day: String(day),
        weekLabel: String(week),
        month: String(month),
        year: String(year),
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

    return NextResponse.json(mapSchedule(created), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal piket keagamaan." }, { status: 403 });
    }
    console.error("Error creating religious picket schedule:", error);
    return NextResponse.json({ error: "Gagal membuat jadwal piket keagamaan." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const { id, teacherId, day, week, month, year } = body;

    if (!id || !teacherId || !day || !week || !month || !year) {
      return NextResponse.json(
        { error: "ID, guru, hari, minggu, bulan, dan tahun wajib diisi." },
        { status: 400 }
      );
    }

    const updated = await prisma.religiousPicketSchedule.update({
      where: { id: String(id) },
      data: {
        teacherId: String(teacherId),
        day: String(day),
        weekLabel: String(week),
        month: String(month),
        year: String(year),
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
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal piket keagamaan." }, { status: 403 });
    }
    console.error("Error updating religious picket schedule:", error);
    return NextResponse.json({ error: "Gagal memperbarui jadwal piket keagamaan." }, { status: 500 });
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

    await prisma.religiousPicketSchedule.delete({
      where: { id: String(id) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah jadwal piket keagamaan." }, { status: 403 });
    }
    console.error("Error deleting religious picket schedule:", error);
    return NextResponse.json({ error: "Gagal menghapus jadwal piket keagamaan." }, { status: 500 });
  }
}
