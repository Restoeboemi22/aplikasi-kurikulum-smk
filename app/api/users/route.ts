import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/server-session";
import { buildTeacherIdentityEmail } from "@/lib/user-identity";

const mapUserForClient = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  nip: user.nip || "",
  role: user.role === "ADMIN" ? "ADMIN" : "TEACHER",
  teacherId: user.teacher?.id || null,
  teacherCode: user.teacher?.kodeGuru || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  gradeCount: user._count?.grades ?? 0,
  journalCount: user._count?.journals ?? 0,
});

const normalizeText = (value?: string | null) => value?.trim() || "";

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);

    const users = await prisma.user.findMany({
      include: {
        teacher: {
          select: { id: true, kodeGuru: true },
        },
        _count: {
          select: { grades: true, journals: true },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(users.map(mapUserForClient));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh melihat data akun." }, { status: 403 });
    }
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Gagal mengambil data akun." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const { name, nip, email, role } = body;

    if (!name || !nip || !role) {
      return NextResponse.json(
        { error: "Nama, NIP, dan role wajib diisi." },
        { status: 400 }
      );
    }

    const normalizedRole = role === "ADMIN" ? "ADMIN" : "TEACHER";
    const normalizedNip = normalizeText(nip);
    const normalizedEmail = buildTeacherIdentityEmail({
      nip: normalizedNip,
      email,
      kodeGuru: normalizedNip,
    });

    const user = await prisma.user.create({
      data: {
        name: normalizeText(name),
        nip: normalizedNip,
        email: normalizedEmail,
        role: normalizedRole,
      },
      include: {
        teacher: true,
        _count: { select: { grades: true, journals: true } },
      },
    });

    return NextResponse.json(mapUserForClient(user), { status: 201 });
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh membuat akun." }, { status: 403 });
    }
    console.error("Error creating user:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "NIP atau email sudah dipakai akun lain." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Gagal membuat akun." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const { id, name, nip, email, role } = body;

    if (!id || !name || !nip || !role) {
      return NextResponse.json(
        { error: "ID, nama, NIP, dan role wajib diisi." },
        { status: 400 }
      );
    }

    const normalizedName = normalizeText(name);
    const normalizedNip = normalizeText(nip);
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        teacher: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    const normalizedEmail = buildTeacherIdentityEmail({
      nip: normalizedNip,
      email,
      kodeGuru: existingUser.teacher?.kodeGuru || normalizedNip,
    });

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: normalizedName,
        nip: normalizedNip,
        email: normalizedEmail,
        role: role === "ADMIN" ? "ADMIN" : "TEACHER",
      },
      include: {
        teacher: true,
        _count: { select: { grades: true, journals: true } },
      },
    });

    return NextResponse.json(mapUserForClient(user));
  } catch (error: any) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah akun." }, { status: 403 });
    }
    console.error("Error updating user:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "NIP atau email sudah dipakai akun lain." },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Gagal memperbarui akun." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(request);
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya admin yang boleh menghapus akun." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID akun wajib diisi." }, { status: 400 });
    }

    if (id === session.uid) {
      return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        teacher: true,
        _count: { select: { grades: true, journals: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    if (user.teacher || user._count.grades > 0 || user._count.journals > 0) {
      return NextResponse.json(
        { error: "Akun ini sudah terhubung ke data guru/nilai/jurnal dan tidak bisa dihapus langsung." },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Gagal menghapus akun." }, { status: 500 });
  }
}
