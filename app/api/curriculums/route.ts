import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/server-session";

const VALID_STATUS = new Set(["AKTIF", "ARSIP"]);

const mapCurriculum = (item: any) => ({
  id: item.id,
  competency: item.competency,
  subject: item.subject,
  gradeLevel: item.gradeLevel,
  semester: item.semester,
  academicYear: item.academicYear,
  cp: item.cp,
  tp: item.tp,
  atp: item.atp,
  timeAllocation: item.timeAllocation,
  status: item.status,
  documentUrl: item.documentUrl || "",
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const getPayload = (body: any) => {
  const competency = String(body.competency || "").trim();
  const subject = String(body.subject || "").trim();
  const gradeLevel = String(body.gradeLevel || "").trim();
  const semester = String(body.semester || "").trim();
  const academicYear = String(body.academicYear || "").trim();
  const cp = String(body.cp || "").trim();
  const tp = String(body.tp || "").trim();
  const atp = String(body.atp || "").trim();
  const timeAllocation = Number(body.timeAllocation || 0);
  const status = String(body.status || "AKTIF").trim().toUpperCase();
  const documentUrl = String(body.documentUrl || "").trim();

  if (!competency || !subject || !gradeLevel || !semester || !academicYear || !cp || !tp || !atp || timeAllocation <= 0) {
    throw new Error("INVALID_PAYLOAD");
  }

  if (!VALID_STATUS.has(status)) {
    throw new Error("INVALID_STATUS");
  }

  return {
    competency,
    subject,
    gradeLevel,
    semester,
    academicYear,
    cp,
    tp,
    atp,
    timeAllocation,
    status,
    documentUrl: documentUrl || null,
  };
};

export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const { searchParams } = new URL(request.url);
    const semester = String(searchParams.get("semester") || "").trim();
    const academicYear = String(searchParams.get("academicYear") || "").trim();

    const items = await prisma.curriculum.findMany({
      where: {
        ...(semester ? { semester } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      orderBy: [{ academicYear: "desc" }, { semester: "asc" }, { competency: "asc" }, { subject: "asc" }],
    });

    return NextResponse.json(items.map(mapCurriculum));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error fetching curriculums:", error);
    return NextResponse.json({ error: "Gagal mengambil data kurikulum." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const payload = getPayload(body);

    const created = await prisma.curriculum.create({
      data: payload as any,
    });

    return NextResponse.json({ curriculum: mapCurriculum(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh menambah kurikulum." }, { status: 403 });
    }
    if (error instanceof Error && (error.message === "INVALID_PAYLOAD" || error.message === "INVALID_STATUS")) {
      return NextResponse.json({ error: "Data kurikulum tidak valid atau belum lengkap." }, { status: 400 });
    }
    console.error("Error creating curriculum:", error);
    return NextResponse.json({ error: "Gagal menyimpan data kurikulum." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "ID kurikulum wajib diisi." }, { status: 400 });
    }

    const payload = getPayload(body);
    const updated = await prisma.curriculum.update({
      where: { id },
      data: payload as any,
    });

    return NextResponse.json({ curriculum: mapCurriculum(updated) });
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah kurikulum." }, { status: 403 });
    }
    if (error instanceof Error && (error.message === "INVALID_PAYLOAD" || error.message === "INVALID_STATUS")) {
      return NextResponse.json({ error: "Data kurikulum tidak valid atau belum lengkap." }, { status: 400 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Data kurikulum tidak ditemukan." }, { status: 404 });
    }
    console.error("Error updating curriculum:", error);
    return NextResponse.json({ error: "Gagal memperbarui data kurikulum." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json({ error: "ID kurikulum wajib diisi." }, { status: 400 });
    }

    await prisma.curriculum.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh menghapus kurikulum." }, { status: 403 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Data kurikulum tidak ditemukan." }, { status: 404 });
    }
    console.error("Error deleting curriculum:", error);
    return NextResponse.json({ error: "Gagal menghapus data kurikulum." }, { status: 500 });
  }
}
