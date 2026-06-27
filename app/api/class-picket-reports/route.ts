import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/server-session";

const allowedStatuses = new Set(["done", "issue"]);
const allowedPeriods = new Set(["1-2", "3-4", "5-6", "7-8"]);

const mapReport = (item: any) => ({
  id: item.id,
  scheduleId: item.scheduleId,
  teacherId: item.teacherId,
  reportDate: item.reportDate,
  className: item.className,
  period: item.period,
  status: item.status,
  updatedAt: item.updatedAt,
});

const parseScheduleIds = (value: string | null) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const { searchParams } = new URL(request.url);
    const reportDate = searchParams.get("reportDate") || "";
    const scheduleIds = parseScheduleIds(searchParams.get("scheduleIds"));

    if (!reportDate || scheduleIds.length === 0) {
      return NextResponse.json([]);
    }

    const reports = await prisma.classPicketReport.findMany({
      where: {
        reportDate,
        scheduleId: { in: scheduleIds },
        ...(session.role === "ADMIN"
          ? {}
          : {
              schedule: {
                teacher: {
                  OR: [{ userId: session.uid }, session.nip ? { user: { nip: session.nip } } : undefined].filter(
                    Boolean
                  ) as any[],
                },
              },
            }),
      },
      orderBy: [{ className: "asc" }, { period: "asc" }],
    });

    return NextResponse.json(reports.map(mapReport));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error fetching class picket reports:", error);
    return NextResponse.json({ error: "Gagal mengambil laporan piket kelas." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();
    const reportDate = String(body.reportDate || "").trim();
    const scheduleIds = Array.isArray(body.scheduleIds)
      ? body.scheduleIds.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (!reportDate || scheduleIds.length === 0) {
      return NextResponse.json({ error: "Tanggal laporan dan jadwal wajib diisi." }, { status: 400 });
    }

    const schedules = await prisma.classPicketSchedule.findMany({
      where: {
        id: { in: scheduleIds },
        ...(session.role === "ADMIN"
          ? {}
          : {
              teacher: {
                OR: [{ userId: session.uid }, session.nip ? { user: { nip: session.nip } } : undefined].filter(
                  Boolean
                ) as any[],
              },
            }),
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

    if (schedules.length !== scheduleIds.length) {
      return NextResponse.json({ error: "Sebagian jadwal piket tidak ditemukan." }, { status: 404 });
    }

    const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
    const sanitizedEntries = entries
      .map((entry: any) => ({
        scheduleId: String(entry.scheduleId || "").trim(),
        className: String(entry.className || "").trim(),
        period: String(entry.period || "").trim(),
        status: String(entry.status || "").trim(),
      }))
      .filter(
        (entry: any) =>
          entry.scheduleId &&
          entry.className &&
          allowedPeriods.has(entry.period) &&
          allowedStatuses.has(entry.status) &&
          scheduleById.has(entry.scheduleId)
      );

    for (const entry of sanitizedEntries) {
      const schedule = scheduleById.get(entry.scheduleId)!;
      const allowedClasses = (schedule.classNames || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!allowedClasses.includes(entry.className)) {
        return NextResponse.json(
          { error: `Kelas ${entry.className} tidak termasuk pada jadwal piket yang dipilih.` },
          { status: 400 }
        );
      }
    }

    const teacherId = schedules[0]?.teacherId;
    await prisma.$transaction(async (tx) => {
      await tx.classPicketReport.deleteMany({
        where: {
          reportDate,
          scheduleId: { in: scheduleIds },
        },
      });

      if (sanitizedEntries.length > 0) {
        await tx.classPicketReport.createMany({
          data: sanitizedEntries.map((entry: any) => ({
            scheduleId: entry.scheduleId,
            teacherId: scheduleById.get(entry.scheduleId)!.teacherId,
            reportDate,
            className: entry.className,
            period: entry.period,
            status: entry.status,
          })),
        });
      }
    });

    const savedReports = await prisma.classPicketReport.findMany({
      where: {
        reportDate,
        scheduleId: { in: scheduleIds },
        ...(teacherId ? { teacherId } : {}),
      },
      orderBy: [{ className: "asc" }, { period: "asc" }],
    });

    return NextResponse.json({
      message: "Laporan piket kelas berhasil disimpan.",
      reports: savedReports.map(mapReport),
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error saving class picket reports:", error);
    return NextResponse.json({ error: "Gagal menyimpan laporan piket kelas." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const reportDate = searchParams.get("reportDate") || "";
    const scheduleIds = parseScheduleIds(searchParams.get("scheduleIds"));

    if (!reportDate || scheduleIds.length === 0) {
      return NextResponse.json({ error: "Tanggal laporan dan jadwal wajib diisi." }, { status: 400 });
    }

    await prisma.classPicketReport.deleteMany({
      where: {
        reportDate,
        scheduleId: { in: scheduleIds },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh menghapus laporan piket kelas." }, { status: 403 });
    }
    console.error("Error deleting class picket reports:", error);
    return NextResponse.json({ error: "Gagal menghapus laporan piket kelas." }, { status: 500 });
  }
}
