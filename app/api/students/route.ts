import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, requireSession } from '@/lib/server-session';

const normalizeNisn = (value?: string | null) => (value || '').replace(/\D/g, '');

const normalizeText = (value: unknown) => String(value ?? '').trim();

function validateStudentPayload(args: { nis?: string; nisn?: string; name?: string }) {
  const nis = normalizeText(args.nis);
  const name = normalizeText(args.name);

  if (!nis || !name) {
    return 'NIS dan nama wajib diisi';
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const { searchParams } = new URL(request.url);
    const classLevel = searchParams.get('classLevel');
    const major = searchParams.get('major');
    const subject = searchParams.get('subject');
    const className = searchParams.get('className');

    const students = await prisma.student.findMany({
      orderBy: { nis: 'asc' }
    });

    if (session.role === 'ADMIN') {
      const filteredStudents = students.filter((student) => {
        const className = student.className || '';
        const matchesKelas = !classLevel || className.startsWith(classLevel);
        const matchesJurusan = !major || className.includes(major);
        return matchesKelas && matchesJurusan;
      });
      return NextResponse.json(filteredStudents);
    }

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

    const filteredStudents = students.filter((student) => {
      const studentClassName = student.className || '';
      const matchesTeacherAssignment = teacher.teachingAssignments.some((assignment) => {
        const subjectMatch = !subject || assignment.subject === subject;
        const classNameMatch = !className || assignment.className === className;
        const classLevelMatch = !classLevel || assignment.classLevel === classLevel;
        const majorMatch = !major || assignment.majorCode === major;
        return (
          subjectMatch &&
          classNameMatch &&
          classLevelMatch &&
          majorMatch &&
          assignment.className === studentClassName
        );
      });
      const matchesKelas = !classLevel || studentClassName.startsWith(classLevel);
      const matchesJurusan = !major || studentClassName.includes(major);
      const matchesClassName = !className || studentClassName === className;
      return matchesTeacherAssignment && matchesKelas && matchesJurusan && matchesClassName;
    });

    return NextResponse.json(filteredStudents);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data siswa' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { 
      nis, nisn, name, gender, className,
      birthPlace, birthDate, address, phone, email
    } = body;

    const validationError = validateStudentPayload({ nis, nisn, name });
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: { 
        nis: normalizeText(nis),
        nisn: normalizeNisn(nisn) || null,
        name: normalizeText(name),
        gender: normalizeText(gender) || null,
        className: normalizeText(className) || null,
        birthPlace: normalizeText(birthPlace) || null,
        birthDate: normalizeText(birthDate) || null,
        address: normalizeText(address) || null,
        phone: normalizeText(phone) || null,
        email: normalizeText(email) || null
      }
    });
    
    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data siswa.' }, { status: 403 });
    }
    console.error('Error creating student:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'NIS atau NISN sudah terdaftar. Silakan gunakan data lain.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Gagal membuat data siswa' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { 
      id, nis, nisn, name, gender, className,
      birthPlace, birthDate, address, phone, email
    } = body;

    const validationError = validateStudentPayload({ nis, nisn, name });
    if (!id || validationError) {
      return NextResponse.json(
        { error: validationError || 'ID wajib diisi' },
        { status: 400 }
      );
    }

    const student = await prisma.student.update({
      where: { id },
      data: { 
        nis: normalizeText(nis),
        nisn: normalizeNisn(nisn) || null,
        name: normalizeText(name),
        gender: normalizeText(gender) || null,
        className: normalizeText(className) || null,
        birthPlace: normalizeText(birthPlace) || null,
        birthDate: normalizeText(birthDate) || null,
        address: normalizeText(address) || null,
        phone: normalizeText(phone) || null,
        email: normalizeText(email) || null
      }
    });
    
    return NextResponse.json(student);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data siswa.' }, { status: 403 });
    }
    console.error('Error updating student:', error);

    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'NIS atau NISN sudah terdaftar. Silakan gunakan data lain.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Gagal memperbarui data siswa' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const { searchParams } = new URL(request.url);
    const ids = Array.from(new Set(searchParams.getAll('id').map((id) => id.trim()).filter(Boolean)));
    
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'ID wajib diisi' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Hapus relasi nilai lebih dulu agar aman untuk database lama
      // yang belum menerapkan cascade delete secara konsisten.
      await tx.grade.deleteMany({
        where: { studentId: { in: ids } }
      });

      await tx.student.deleteMany({
        where: { id: { in: ids } }
      });
    });
    
    return NextResponse.json({
      message: ids.length === 1 ? 'Siswa berhasil dihapus' : `${ids.length} siswa berhasil dihapus`,
      deletedCount: ids.length,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data siswa.' }, { status: 403 });
    }
    console.error('Error deleting student:', error);

    return NextResponse.json(
      { error: 'Gagal menghapus data siswa. Periksa relasi data yang masih terhubung.' },
      { status: 500 }
    );
  }
}
