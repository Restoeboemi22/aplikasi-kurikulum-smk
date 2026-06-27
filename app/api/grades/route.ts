import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/server-session';

const isSemesterLabelValid = (semester: string) =>
  /^(Ganjil|Genap)\s+\d{4}\/\d{4}$/.test(semester);

// GET all grades or filter by classLevel, major, jenisPenilaian
export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const { searchParams } = new URL(request.url);
    const classLevel = searchParams.get('classLevel');
    const major = searchParams.get('major');
    const jenisPenilaian = searchParams.get('jenisPenilaian');
    const teacherId = searchParams.get('teacherId');
    const subject = searchParams.get('subject');
    const semester = searchParams.get('semester');
    const className = searchParams.get('className');

    const filters: any = {};
    if (classLevel) filters.classLevel = classLevel;
    if (major) filters.major = major;
    if (jenisPenilaian) filters.jenisPenilaian = jenisPenilaian;
    if (teacherId) filters.teacherId = teacherId;
    if (subject) filters.subject = subject;
    if (semester) filters.semester = semester;
    if (className) {
      filters.student = {
        className,
      };
    }

    if (session.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { userId: session.uid },
            session.nip ? { user: { nip: session.nip } } : null,
          ].filter(Boolean) as any[],
        },
        include: {
          teachingAssignments: true,
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: 'Guru aktif pada session tidak ditemukan di database admin.' },
          { status: 403 }
        );
      }

      filters.teacherId = teacher.id;
    }

    const grades = await prisma.grade.findMany({
      where: filters,
      include: {
        student: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ subject: 'asc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json(grades);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error fetching grades:', error);
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}

// POST a new grade or update existing
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();
    const {
      studentName,
      classLevel,
      major,
      className,
      jenisPenilaian,
      nilai1,
      nilai2,
      nilai3,
      nilaiAkhir,
      subject,
      semester = 'Ganjil 2024/2025',
    } = body;

    if (!studentName || !classLevel || !major || !jenisPenilaian || !subject) {
      return NextResponse.json(
        { error: 'Data siswa, kelas, jurusan, dan mapel wajib diisi.' },
        { status: 400 }
      );
    }

    if (!semester || !isSemesterLabelValid(semester)) {
      return NextResponse.json(
        { error: 'Semester dan tahun ajaran tidak valid.' },
        { status: 400 }
      );
    }

    // Cari siswa dari database yang sudah ada di halaman admin.
    let student = await prisma.student.findFirst({
      where: {
        name: studentName,
        ...(className
          ? { className }
          : {
              className: {
                startsWith: `${classLevel} ${major}`,
              },
            }),
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Siswa tidak ditemukan di database admin.' },
        { status: 404 }
      );
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ user: { nip: session.nip } }, { user: { name: session.name } }],
      },
      include: { user: true, teachingAssignments: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Guru aktif pada session tidak ditemukan di database admin.' },
        { status: 403 }
      );
    }

    if (session.role !== 'TEACHER' || teacher.user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Hanya akun guru yang boleh menyimpan nilai.' },
        { status: 403 }
      );
    }

    const matchedAssignment = teacher.teachingAssignments.find((assignment) => {
      if (assignment.subject !== subject) return false;
      if (className) {
        return assignment.className === className;
      }
      return assignment.classLevel === classLevel && assignment.majorCode === major;
    });

    if (!matchedAssignment) {
      return NextResponse.json(
        { error: 'Guru tidak memiliki penugasan untuk kombinasi mata pelajaran dan kelas tersebut.' },
        { status: 403 }
      );
    }

    const existingGrade = await prisma.grade.findFirst({
      where: {
        studentId: student.id,
        classLevel,
        major,
        jenisPenilaian,
        subject,
        semester,
        teacherId: teacher.id,
      },
    });

    let grade;
    if (existingGrade) {
      grade = await prisma.grade.update({
        where: { id: existingGrade.id },
        data: {
          nilai1: nilai1 || null,
          nilai2: nilai2 || null,
          nilai3: nilai3 || null,
          nilaiAkhir: nilaiAkhir || null,
          userId: teacher.userId,
        },
      });
    } else {
      grade = await prisma.grade.create({
        data: {
          studentId: student.id,
          subject,
          classLevel,
          major,
          jenisPenilaian,
          semester,
          nilai1: nilai1 || null,
          nilai2: nilai2 || null,
          nilai3: nilai3 || null,
          nilaiAkhir: nilaiAkhir || null,
          teacherId: teacher.id,
          userId: teacher.userId,
        },
      });
    }

    return NextResponse.json(grade, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error saving grade:', error);
    return NextResponse.json({ error: 'Failed to save grade' }, { status: 500 });
  }
}
