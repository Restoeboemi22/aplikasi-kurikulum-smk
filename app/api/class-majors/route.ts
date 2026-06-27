import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, requireSession } from '@/lib/server-session';

export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const classMajors = await prisma.classMajor.findMany({
      include: {
        homeroomTeacherProfile: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { className: 'asc' }
    });
    return NextResponse.json(
      classMajors.map((item) => ({
        ...item,
        homeroomTeacher:
          item.homeroomTeacherProfile?.user?.name || item.homeroomTeacher || null,
      }))
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error fetching class-majors:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data kelas dan jurusan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { 
      className, grade, majorCode, majorName,
      homeroomTeacherId, room
    } = body;
    
    if (!className || !grade || !majorCode) {
      return NextResponse.json(
        { error: 'Nama kelas, tingkat, dan jurusan wajib diisi' },
        { status: 400 }
      );
    }

    let homeroomTeacherName: string | null = null;
    if (homeroomTeacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: homeroomTeacherId },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: 'Wali kelas yang dipilih tidak ditemukan.' },
          { status: 400 }
        );
      }

      homeroomTeacherName = teacher.user.name;
    }

    const classMajor = await prisma.classMajor.create({
      data: { 
        className, grade, majorCode, majorName,
        homeroomTeacher: homeroomTeacherName,
        homeroomTeacherId: homeroomTeacherId || null,
        room
      },
      include: {
        homeroomTeacherProfile: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json(
      {
        ...classMajor,
        homeroomTeacher:
          classMajor.homeroomTeacherProfile?.user?.name || classMajor.homeroomTeacher || null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data kelas dan jurusan.' }, { status: 403 });
    }
    console.error('Error creating class-major:', error);
    return NextResponse.json(
      { error: 'Gagal membuat data kelas dan jurusan' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { 
      id, className, grade, majorCode, majorName,
      homeroomTeacherId, room
    } = body;
    
    if (!id || !className || !grade || !majorCode) {
      return NextResponse.json(
        { error: 'ID, nama kelas, tingkat, dan jurusan wajib diisi' },
        { status: 400 }
      );
    }

    let homeroomTeacherName: string | null = null;
    if (homeroomTeacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: homeroomTeacherId },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: 'Wali kelas yang dipilih tidak ditemukan.' },
          { status: 400 }
        );
      }

      homeroomTeacherName = teacher.user.name;
    }

    const classMajor = await prisma.classMajor.update({
      where: { id },
      data: { 
        className, grade, majorCode, majorName,
        homeroomTeacher: homeroomTeacherName,
        homeroomTeacherId: homeroomTeacherId || null,
        room
      },
      include: {
        homeroomTeacherProfile: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json({
      ...classMajor,
      homeroomTeacher:
        classMajor.homeroomTeacherProfile?.user?.name || classMajor.homeroomTeacher || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data kelas dan jurusan.' }, { status: 403 });
    }
    console.error('Error updating class-major:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui data kelas dan jurusan' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID wajib diisi' },
        { status: 400 }
      );
    }

    await prisma.classMajor.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Kelas dan jurusan berhasil dihapus' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data kelas dan jurusan.' }, { status: 403 });
    }
    console.error('Error deleting class-major:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data kelas dan jurusan' },
      { status: 500 }
    );
  }
}
