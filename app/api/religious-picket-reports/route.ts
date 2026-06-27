import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/server-session";

const mapReport = (item: any) => ({
  id: item.id,
  scheduleId: item.scheduleId,
  teacherId: item.teacherId,
  reportDate: item.reportDate,
  status: item.status,
  checkInTime: item.checkInTime,
  notes: item.notes,
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

    const reports = await prisma.religiousPicketReport.findMany({
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
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json(reports.map(mapReport));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error fetching religious picket reports:", error);
    return NextResponse.json({ error: "Gagal mengambil laporan piket keagamaan." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();
    const scheduleId = String(body.scheduleId || "").trim();
    const reportDate = String(body.reportDate || "").trim();
    const status = String(body.status || "").trim() || "Belum";
    const notes = String(body.notes || "").trim();

    if (!scheduleId || !reportDate) {
      return NextResponse.json({ error: "Jadwal dan tanggal laporan wajib diisi." }, { status: 400 });
    }

    const schedule = await prisma.religiousPicketSchedule.findFirst({
      where: {
        id: scheduleId,
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
    });

    if (!schedule) {
      return NextResponse.json({ error: "Jadwal piket keagamaan tidak ditemukan." }, { status: 404 });
    }

    const now = new Date();
    const saved = await prisma.religiousPicketReport.upsert({
      where: {
        scheduleId_reportDate: {
          scheduleId,
          reportDate,
        },
      },
      update: {
        status,
        notes: notes || null,
        checkInTime: status === "Sudah" ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null,
      },
      create: {
        scheduleId,
        teacherId: schedule.teacherId,
        reportDate,
        status,
        notes: notes || null,
        checkInTime: status === "Sudah" ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null,
      },
    });

    return NextResponse.json({
      message: "Laporan piket keagamaan berhasil disimpan.",
      report: mapReport(saved),
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error saving religious picket report:", error);
    return NextResponse.json({ error: "Gagal menyimpan laporan piket keagamaan." }, { status: 500 });
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

    await prisma.religiousPicketReport.deleteMany({
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
      return NextResponse.json({ error: "Hanya admin yang boleh menghapus laporan piket keagamaan." }, { status: 403 });
    }
    console.error("Error deleting religious picket reports:", error);
    return NextResponse.json({ error: "Gagal menghapus laporan piket keagamaan." }, { status: 500 });
  }
}
