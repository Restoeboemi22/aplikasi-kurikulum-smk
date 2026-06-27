import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/server-session";

type SessionTeacher = {
  uid: string;
  nip?: string | null;
};

const normalizeObjectives = (objectives: unknown) =>
  Array.isArray(objectives)
    ? objectives
        .map((item) => String(item).trim())
        .filter(Boolean)
    : [];

const isValidSemester = (value?: string | null): value is "Ganjil" | "Genap" =>
  value === "Ganjil" || value === "Genap";

async function resolveTeacherForSession(session: SessionTeacher) {
  return prisma.teacher.findFirst({
    where: {
      OR: [
        { userId: session.uid },
        session.nip ? { user: { nip: session.nip } } : null,
      ].filter(Boolean) as any[],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nip: true,
        },
      },
      teachingAssignments: true,
    },
  });
}

function ensureTeacherOwnAssignment(
  teacher: Awaited<ReturnType<typeof resolveTeacherForSession>>,
  className: string,
  subject: string
) {
  if (!teacher) {
    throw new Error("Guru aktif pada session tidak ditemukan.");
  }

  const matchedAssignment = teacher.teachingAssignments.find(
    (assignment) => assignment.subject === subject && assignment.className === className
  );

  if (!matchedAssignment) {
    throw new Error("Kelas tidak sesuai penugasan guru.");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const className = searchParams.get("className");
    const subject = searchParams.get("subject");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!academicYear || !isValidSemester(semester)) {
      return NextResponse.json(
        { error: "Tahun ajaran dan semester wajib dipilih." },
        { status: 400 }
      );
    }

    if (session.role === "TEACHER") {
      const teacher = await resolveTeacherForSession(session);

      if (!teacher) {
        return NextResponse.json(
          { error: "Guru aktif pada session tidak ditemukan." },
          { status: 403 }
        );
      }

      if (!className || !subject) {
        return NextResponse.json(
          { error: "Kelas dan mata pelajaran wajib dipilih." },
          { status: 400 }
        );
      }

      ensureTeacherOwnAssignment(teacher, className, subject);

      const objectives = await prisma.teachingObjective.findMany({
        where: {
          teacherId: teacher.id,
          className,
          subject,
          academicYear,
          semester,
        },
        orderBy: [{ orderNo: "asc" }],
      });

      return NextResponse.json({ objectives });
    }

    const objectives = await prisma.teachingObjective.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        ...(className ? { className } : {}),
        ...(subject ? { subject } : {}),
        academicYear,
        semester,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { teacher: { user: { name: "asc" } } },
        { className: "asc" },
        { subject: "asc" },
        { orderNo: "asc" },
      ],
      take: 300,
    });

    return NextResponse.json({
      objectives: objectives.map((item) => ({
        id: item.id,
        teacherId: item.teacherId,
        teacherName: item.teacher.user.name,
        className: item.className,
        subject: item.subject,
        academicYear: item.academicYear,
        semester: item.semester,
        objectiveText: item.objectiveText,
        orderNo: item.orderNo,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    console.error("Error fetching teaching objectives:", error);
    return NextResponse.json(
      { error: "Gagal memuat data tujuan pembelajaran." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);

    if (session.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Input TP dilakukan melalui akun guru." },
        { status: 403 }
      );
    }

    const teacher = await resolveTeacherForSession(session);
    const body = await request.json().catch(() => null);
    const academicYear = String(body?.academicYear || "").trim();
    const semester = String(body?.semester || "").trim();
    const className = String(body?.className || "").trim();
    const subject = String(body?.subject || "").trim();
    const objectives = normalizeObjectives(body?.objectives);

    if (!academicYear || !isValidSemester(semester) || !className || !subject) {
      return NextResponse.json(
        { error: "Tahun ajaran, semester, kelas, dan mata pelajaran wajib diisi." },
        { status: 400 }
      );
    }

    ensureTeacherOwnAssignment(teacher, className, subject);

    const savedObjectives = await prisma.$transaction(async (tx) => {
      await tx.teachingObjective.deleteMany({
        where: {
          teacherId: teacher!.id,
          academicYear,
          semester,
          className,
          subject,
        },
      });

      if (objectives.length > 0) {
        await tx.teachingObjective.createMany({
          data: objectives.map((objectiveText, index) => ({
            teacherId: teacher!.id,
            academicYear,
            semester,
            className,
            subject,
            objectiveText,
            orderNo: index + 1,
          })),
        });
      }

      return tx.teachingObjective.findMany({
        where: {
          teacherId: teacher!.id,
          academicYear,
          semester,
          className,
          subject,
        },
        orderBy: [{ orderNo: "asc" }],
      });
    });

    return NextResponse.json({
      message: objectives.length > 0 ? "TP berhasil disimpan." : "TP berhasil dikosongkan.",
      objectives: savedObjectives,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error saving teaching objectives:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan tujuan pembelajaran." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = requireSession(request);
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");
    const className = searchParams.get("className");
    const subject = searchParams.get("subject");
    const teacherId = searchParams.get("teacherId");

    if (!academicYear || !isValidSemester(semester) || !className || !subject) {
      return NextResponse.json(
        { error: "Tahun ajaran, semester, kelas, dan mata pelajaran wajib diisi." },
        { status: 400 }
      );
    }

    if (session.role === "TEACHER") {
      const teacher = await resolveTeacherForSession(session);
      ensureTeacherOwnAssignment(teacher, className, subject);

      await prisma.teachingObjective.deleteMany({
        where: {
          teacherId: teacher!.id,
          academicYear,
          semester,
          className,
          subject,
        },
      });

      return NextResponse.json({ message: "TP berhasil dihapus untuk mapel dan kelas ini." });
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher ID wajib diisi untuk reset dari akun admin." },
        { status: 400 }
      );
    }

    await prisma.teachingObjective.deleteMany({
      where: {
        teacherId,
        academicYear,
        semester,
        className,
        subject,
      },
    });

    return NextResponse.json({ message: "TP berhasil dihapus." });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error deleting teaching objectives:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tujuan pembelajaran." },
      { status: 500 }
    );
  }
}
