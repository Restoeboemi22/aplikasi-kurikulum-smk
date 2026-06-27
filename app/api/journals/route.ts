import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/server-session";

const mapJournalForClient = (journal: any) => ({
  id: journal.id,
  teacherId: journal.teacherId,
  teacher: journal.teacher?.user?.name || journal.user?.name || "",
  subject: journal.subject,
  class: journal.classLevel,
  semester: journal.semester,
  academicYear: journal.academicYear,
  date: new Date(journal.date).toISOString().slice(0, 10),
  jamKe: journal.jamKe || "",
  material: journal.material,
  presentCount: String(journal.presentCount ?? 0),
  absentCount: String(journal.absentCount ?? 0),
  issues: journal.issues || "",
  status: journal.verifyStatus,
  createdAt: new Date(journal.createdAt).getTime(),
});

const resolveTeacherForSession = async (sessionUid: string) => {
  return prisma.teacher.findUnique({
    where: { userId: sessionUid },
    include: { user: true, teachingAssignments: true },
  });
};

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester");
    const academicYear = searchParams.get("academicYear");

    const where: any = {};
    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;
    if (session.role === "TEACHER") where.userId = session.uid;

    const journals = await prisma.journal.findMany({
      where,
      include: {
        user: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(journals.map(mapJournalForClient));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error fetching journals:", error);
    return NextResponse.json({ error: "Gagal mengambil data jurnal." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();
    const {
      teacherId,
      subject,
      className,
      semester,
      academicYear,
      date,
      jamKe,
      material,
      presentCount,
      absentCount,
      issues,
    } = body;

    if (!subject || !className || !semester || !academicYear || !date || !material) {
      return NextResponse.json(
        { error: "Data jurnal belum lengkap." },
        { status: 400 }
      );
    }

    const targetTeacher =
      session.role === "ADMIN" && teacherId
        ? await prisma.teacher.findUnique({
            where: { id: teacherId },
            include: { user: true, teachingAssignments: true },
          })
        : await resolveTeacherForSession(session.uid);

    if (!targetTeacher) {
      return NextResponse.json(
        { error: "Guru untuk jurnal ini tidak ditemukan." },
        { status: 400 }
      );
    }

    if (session.role === "TEACHER" && targetTeacher.userId !== session.uid) {
      return NextResponse.json(
        { error: "Guru hanya boleh membuat jurnal miliknya sendiri." },
        { status: 403 }
      );
    }

    const matchedAssignment = targetTeacher.teachingAssignments.find(
      (assignment) => assignment.subject === subject && assignment.className === className
    );

    if (!matchedAssignment) {
      return NextResponse.json(
        { error: "Kombinasi mata pelajaran dan kelas tidak sesuai penugasan guru." },
        { status: 400 }
      );
    }

    const journal = await prisma.journal.create({
      data: {
        date: new Date(date),
        teacherId: targetTeacher.id,
        userId: targetTeacher.userId,
        classLevel: className,
        subject,
        semester,
        academicYear,
        jamKe: Array.isArray(jamKe) ? jamKe.join(",") : jamKe || null,
        material,
        method: "",
        presentCount: Number(presentCount || 0),
        absentCount: Number(absentCount || 0),
        issues: issues || null,
        notes: null,
        verifyStatus: "SUDAH",
      },
      include: {
        user: true,
        teacher: { include: { user: true } },
      },
    });

    return NextResponse.json(mapJournalForClient(journal), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error creating journal:", error);
    return NextResponse.json({ error: "Gagal menyimpan jurnal." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID jurnal wajib diisi." }, { status: 400 });
    }

    const journal = await prisma.journal.findUnique({ where: { id } });
    if (!journal) {
      return NextResponse.json({ error: "Jurnal tidak ditemukan." }, { status: 404 });
    }

    if (session.role !== "ADMIN" && journal.userId !== session.uid) {
      return NextResponse.json(
        { error: "Anda tidak boleh menghapus jurnal milik pengguna lain." },
        { status: 403 }
      );
    }

    await prisma.journal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error deleting journal:", error);
    return NextResponse.json({ error: "Gagal menghapus jurnal." }, { status: 500 });
  }
}
