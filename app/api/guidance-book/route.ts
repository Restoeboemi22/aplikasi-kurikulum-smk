import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/server-session";

const VALID_NOTES = new Set(["Telat", "Ijin", "Alpa"]);

const formatDayName = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("id-ID", { weekday: "long" });
  return day.charAt(0).toUpperCase() + day.slice(1);
};

const mapEntry = (item: any, index: number) => ({
  id: item.id,
  no: index + 1,
  teacherId: item.teacherId || "",
  teacherName: item.teacherName,
  day: item.day,
  date: item.date,
  keterangan: item.keterangan,
  notes: item.notes || "",
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const getPayload = (body: any) => {
  const teacherId = String(body.teacherId || "").trim();
  const teacherName = String(body.teacherName || "").trim();
  const date = String(body.date || "").trim();
  const keterangan = String(body.keterangan || "").trim();
  const notes = String(body.notes || "").trim();
  const day = formatDayName(date);

  if (!teacherName || !date || !day || !VALID_NOTES.has(keterangan)) {
    throw new Error("INVALID_PAYLOAD");
  }

  return {
    teacherId: teacherId || null,
    teacherName,
    date,
    day,
    keterangan,
    notes: notes || null,
  };
};

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const items = await prisma.guidanceBookEntry.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(items.map((item, index) => mapEntry(item, index)));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh membuka buku pembinaan." }, { status: 403 });
    }
    console.error("Error fetching guidance book entries:", error);
    return NextResponse.json({ error: "Gagal mengambil data buku pembinaan." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const payload = getPayload(body);

    const created = await prisma.guidanceBookEntry.create({
      data: payload,
    });

    return NextResponse.json({ entry: mapEntry(created, 0) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh menambah catatan pembinaan." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "INVALID_PAYLOAD") {
      return NextResponse.json({ error: "Data catatan pembinaan tidak valid atau belum lengkap." }, { status: 400 });
    }
    console.error("Error creating guidance book entry:", error);
    return NextResponse.json({ error: "Gagal menyimpan catatan pembinaan." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "ID catatan pembinaan wajib diisi." }, { status: 400 });
    }

    const payload = getPayload(body);
    const updated = await prisma.guidanceBookEntry.update({
      where: { id },
      data: payload,
    });

    return NextResponse.json({ entry: mapEntry(updated, 0) });
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah catatan pembinaan." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "INVALID_PAYLOAD") {
      return NextResponse.json({ error: "Data catatan pembinaan tidak valid atau belum lengkap." }, { status: 400 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Catatan pembinaan tidak ditemukan." }, { status: 404 });
    }
    console.error("Error updating guidance book entry:", error);
    return NextResponse.json({ error: "Gagal memperbarui catatan pembinaan." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json({ error: "ID catatan pembinaan wajib diisi." }, { status: 400 });
    }

    await prisma.guidanceBookEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh menghapus catatan pembinaan." }, { status: 403 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Catatan pembinaan tidak ditemukan." }, { status: 404 });
    }
    console.error("Error deleting guidance book entry:", error);
    return NextResponse.json({ error: "Gagal menghapus catatan pembinaan." }, { status: 500 });
  }
}
