import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, requireSession } from '@/lib/server-session';
import { buildTeacherIdentityEmail, buildTeacherLoginUsername } from '@/lib/user-identity';
import { provisionFirebasePasswordUser } from '@/lib/firebase-auth-rest';

type TeachingAssignmentInput = {
  subject?: string;
  className?: string;
};

type NormalizedTeachingAssignment = {
  subject: string;
  className: string;
  classLevel: string;
  majorCode: string;
  majorName: string | null;
};

const splitCsv = (value?: string | null) =>
  value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];

const normalizeOptional = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeCsvInput = (value?: string | string[] | null) => {
  if (Array.isArray(value)) {
    const items = value.map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items.join(',') : null;
  }

  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeArrayToCsv = (value?: string[] | null) =>
  Array.isArray(value) && value.length > 0 ? value.join(',') : null;

const normalizeAssignmentInputs = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => ({
          subject: String((item as TeachingAssignmentInput)?.subject || '').trim(),
          className: String((item as TeachingAssignmentInput)?.className || '').trim(),
        }))
        .filter((item) => item.subject && item.className)
    : [];

const deduplicateAssignments = <
  T extends {
    subject: string;
    className: string;
  }
>(
  assignments: T[]
) =>
  Array.from(
    new Map(assignments.map((assignment) => [`${assignment.subject}::${assignment.className}`, assignment])).values()
  );

async function resolveTeachingAssignments(
  tx: any,
  payload: {
    teachingAssignments?: unknown;
    mataPelajaran?: string | string[] | null;
    tingkatKelas?: string[] | null;
    jurusan?: string[] | null;
  }
): Promise<NormalizedTeachingAssignment[]> {
  const directAssignments = normalizeAssignmentInputs(payload.teachingAssignments);

  if (directAssignments.length > 0) {
    const classMajors = await tx.classMajor.findMany({
      where: {
        className: {
          in: directAssignments.map((item) => item.className),
        },
      },
    });

    const classMap = new Map<string, any>(classMajors.map((item: any) => [item.className, item]));
    const unresolvedClasses = directAssignments
      .map((item) => item.className)
      .filter((className) => !classMap.has(className));

    if (unresolvedClasses.length > 0) {
      throw new Error(`CLASS_NOT_FOUND:${unresolvedClasses.join(', ')}`);
    }

    return deduplicateAssignments(
      directAssignments.map((assignment) => {
        const classInfo: any = classMap.get(assignment.className)!;
        return {
          subject: assignment.subject,
          className: assignment.className,
          classLevel: classInfo.grade,
          majorCode: classInfo.majorCode,
          majorName: classInfo.majorName || null,
        };
      })
    );
  }

  const subjects = Array.isArray(payload.mataPelajaran)
    ? payload.mataPelajaran.map((item) => item.trim()).filter(Boolean)
    : splitCsv(payload.mataPelajaran || undefined);
  const grades = Array.isArray(payload.tingkatKelas)
    ? payload.tingkatKelas.map((item) => item.trim()).filter(Boolean)
    : [];
  const majors = Array.isArray(payload.jurusan)
    ? payload.jurusan.map((item) => item.trim()).filter(Boolean)
    : [];

  if (subjects.length === 0 || grades.length === 0 || majors.length === 0) {
    return [];
  }

  const classMajors = await tx.classMajor.findMany({
    where: {
      grade: { in: grades },
      majorCode: { in: majors },
    },
  });

  return deduplicateAssignments(
    classMajors.flatMap((classInfo: any) =>
      subjects.map((subject) => ({
        subject,
        className: classInfo.className,
        classLevel: classInfo.grade,
        majorCode: classInfo.majorCode,
        majorName: classInfo.majorName || null,
      }))
    )
  );
}

const buildTeacherSummaryFromAssignments = (
  assignments: NormalizedTeachingAssignment[]
) => ({
  mataPelajaran:
    assignments.length > 0
      ? Array.from(new Set(assignments.map((item) => item.subject))).join(',')
      : null,
  tingkatKelas:
    assignments.length > 0
      ? Array.from(new Set(assignments.map((item) => item.classLevel)))
      : [],
  jurusan:
    assignments.length > 0
      ? Array.from(new Set(assignments.map((item) => item.majorCode)))
      : [],
});

const mapTeacherForClient = (teacher: any) => ({
  id: teacher.id,
  userId: teacher.userId,
  kodeGuru: teacher.kodeGuru,
  tanggalLahir: teacher.tanggalLahir || '',
  name: teacher.user?.name || '',
  email: teacher.user?.email || '',
  nip: teacher.user?.nip || '',
  mataPelajaran: teacher.mataPelajaran || '',
  jenisKelamin: teacher.jenisKelamin || '',
  tingkatKelas: splitCsv(teacher.tingkatKelas),
  jurusan: splitCsv(teacher.jurusan),
  teachingAssignments: (teacher.teachingAssignments || [])
    .map((assignment: any) => ({
      id: assignment.id,
      subject: assignment.subject,
      className: assignment.className,
      classLevel: assignment.classLevel,
      majorCode: assignment.majorCode,
      majorName: assignment.majorName || null,
    }))
    .sort((a: any, b: any) =>
      a.subject.localeCompare(b.subject, 'id') || a.className.localeCompare(b.className, 'id')
    ),
});

async function resolveTeacherForSession(session: { uid: string; nip?: string | null }) {
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
          email: true,
          nip: true,
          role: true,
        },
      },
      teachingAssignments: true,
      _count: {
        select: {
          grades: true,
          journals: true,
        },
      },
    },
  });
}

async function resolveUserForTeacher(tx: any, input: {
  teacherId?: string;
  currentUserId?: string;
  kodeGuru: string;
  teacherName: string;
  birthDate?: string | null;
  email?: string | null;
  nip?: string | null;
}) {
  const normalizedNip = normalizeOptional(input.nip);
  const normalizedEmail = buildTeacherIdentityEmail({
    birthDate: input.birthDate,
    nip: normalizedNip,
    email: input.email,
    kodeGuru: input.kodeGuru,
  });

  const matchOrConditions = [
    normalizedNip ? { nip: normalizedNip } : null,
    { email: normalizedEmail },
  ].filter(Boolean) as Array<{ nip?: string; email?: string }>;

  const matchedUser = matchOrConditions.length
    ? await tx.user.findFirst({
        where: {
          OR: matchOrConditions,
        },
        include: {
          teacher: true,
          _count: {
            select: {
              grades: true,
              journals: true,
            },
          },
        },
      })
    : null;

  if (
    matchedUser &&
    matchedUser.teacher &&
    matchedUser.teacher.id !== input.teacherId
  ) {
    throw new Error("USER_ALREADY_LINKED_TO_OTHER_TEACHER");
  }

  const targetUser =
    matchedUser && (!input.currentUserId || matchedUser.id !== input.currentUserId)
      ? await tx.user.update({
          where: { id: matchedUser.id },
          data: {
            name: input.teacherName,
            email: normalizedEmail,
            nip: normalizedNip,
            role: matchedUser.role === 'ADMIN' ? 'ADMIN' : 'TEACHER',
          },
          include: {
            teacher: true,
            _count: {
              select: {
                grades: true,
                journals: true,
              },
            },
          },
        })
      : input.currentUserId
        ? await tx.user.update({
            where: { id: input.currentUserId },
            data: {
              name: input.teacherName,
              email: normalizedEmail,
              nip: normalizedNip,
            },
            include: {
              teacher: true,
              _count: {
                select: {
                  grades: true,
                  journals: true,
                },
              },
            },
          })
        : await tx.user.create({
            data: {
              name: input.teacherName,
              email: normalizedEmail,
              role: 'TEACHER',
              nip: normalizedNip,
            },
            include: {
              teacher: true,
              _count: {
                select: {
                  grades: true,
                  journals: true,
                },
              },
            },
          });

  return {
    user: targetUser,
    matchedExistingUser: Boolean(matchedUser && matchedUser.id !== input.currentUserId),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);

    if (session.role === 'ADMIN') {
      const teachers = await prisma.teacher.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              nip: true
            }
          },
          teachingAssignments: true,
        },
        orderBy: { kodeGuru: 'asc' }
      });
      return NextResponse.json(teachers.map(mapTeacherForClient));
    }

    const teacher = await resolveTeacherForSession(session);
    return NextResponse.json(teacher ? [mapTeacherForClient(teacher)] : []);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data guru' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { 
      kodeGuru, tanggalLahir, nama, name, mataPelajaran,
      jenisKelamin, tingkatKelas, jurusan, email, nip, teachingAssignments
    } = body;
    const teacherName = nama || name;
    const normalizedKodeGuru = kodeGuru?.trim();
    const normalizedTanggalLahir = normalizeOptional(tanggalLahir);
    const normalizedNip = normalizeOptional(nip);
    const normalizedEmail = buildTeacherIdentityEmail({
      birthDate: normalizedTanggalLahir,
      nip: normalizedNip,
      email,
      kodeGuru: normalizedKodeGuru || kodeGuru,
    });
    
    if (!normalizedKodeGuru || !teacherName) {
      return NextResponse.json(
        { error: 'Kode guru dan nama wajib diisi' },
        { status: 400 }
      );
    }

    const existingTeacherByCode = await prisma.teacher.findUnique({
      where: { kodeGuru: normalizedKodeGuru },
      include: {
        user: {
          select: {
            name: true,
            nip: true,
            email: true,
          },
        },
      },
    });

    if (existingTeacherByCode) {
      return NextResponse.json(
        {
          error: `Kode guru ${normalizedKodeGuru} sudah dipakai oleh ${existingTeacherByCode.user?.name || "guru lain"}. Gunakan Edit jika ingin memperbarui data yang sama.`,
        },
        { status: 400 }
      );
    }

    const existingUserWithTeacher = await prisma.user.findFirst({
      where: {
        OR: [
          normalizedNip ? { nip: normalizedNip } : null,
          { email: normalizedEmail },
        ].filter(Boolean) as Array<{ nip?: string; email?: string }>,
      },
      include: {
        teacher: {
          select: {
            id: true,
            kodeGuru: true,
          },
        },
      },
    });

    if (existingUserWithTeacher?.teacher) {
      return NextResponse.json(
        {
          error: `NIP atau email ini sudah terhubung ke guru dengan kode ${existingUserWithTeacher.teacher.kodeGuru}. Gunakan Edit pada data guru yang sudah ada.`,
        },
        { status: 400 }
      );
    }

    const teacher = await prisma.$transaction(async (tx) => {
      const assignments = await resolveTeachingAssignments(tx, {
        teachingAssignments,
        mataPelajaran,
        tingkatKelas,
        jurusan,
      });
      const teacherSummary = buildTeacherSummaryFromAssignments(assignments);
      const { user } = await resolveUserForTeacher(tx, {
        kodeGuru: normalizedKodeGuru,
        teacherName,
        birthDate: normalizedTanggalLahir,
        email,
        nip: normalizedNip,
      });
      const createdTeacher = await tx.teacher.create({
        data: { 
          userId: user.id,
          kodeGuru: normalizedKodeGuru, 
          tanggalLahir: normalizedTanggalLahir, 
          mataPelajaran: teacherSummary.mataPelajaran,
          jenisKelamin, 
          tingkatKelas: normalizeArrayToCsv(teacherSummary.tingkatKelas),
          jurusan: normalizeArrayToCsv(teacherSummary.jurusan)
        },
        include: {
          user: true,
          teachingAssignments: true,
        }
      });

      if (assignments.length > 0) {
        await tx.teachingAssignment.createMany({
          data: assignments.map((assignment) => ({
            teacherId: createdTeacher.id,
            subject: assignment.subject,
            className: assignment.className,
            classLevel: assignment.classLevel,
            majorCode: assignment.majorCode,
            majorName: assignment.majorName,
          })),
        });
      }

      return tx.teacher.findUnique({
        where: { id: createdTeacher.id },
        include: {
          user: true,
          teachingAssignments: true,
        },
      });
    });

    if (!teacher) {
      throw new Error('TEACHER_CREATE_FAILED');
    }

    const loginHint = buildTeacherLoginUsername({
      birthDate: normalizedTanggalLahir,
      nip: normalizedNip,
      kodeGuru: normalizedKodeGuru,
    });
    const firebaseAuth = await provisionFirebasePasswordUser({
      email: teacher.user.email,
      loginHint,
    });

    return NextResponse.json(
      {
        teacher: mapTeacherForClient(teacher),
        firebaseAuth,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data guru.' }, { status: 403 });
    }
    console.error('Error creating teacher:', error);

    if (error instanceof Error && error.message === 'USER_ALREADY_LINKED_TO_OTHER_TEACHER') {
      return NextResponse.json(
        { error: 'Akun user dengan NIP/email ini sudah terhubung ke data guru lain.' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith('CLASS_NOT_FOUND:')) {
      return NextResponse.json(
        { error: `Kelas untuk penugasan tidak ditemukan: ${error.message.replace('CLASS_NOT_FOUND:', '').trim()}` },
        { status: 400 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Kode guru, NIP, atau email sudah terdaftar.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Gagal membuat data guru' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { 
      id, kodeGuru, tanggalLahir, nama, name, mataPelajaran,
      jenisKelamin, tingkatKelas, jurusan, email, nip, teachingAssignments
    } = body;
    const teacherName = nama || name;
    const normalizedKodeGuru = kodeGuru?.trim();
    const normalizedNip = normalizeOptional(nip);
    const normalizedTanggalLahir = normalizeOptional(tanggalLahir);
    
    if (!id || !normalizedKodeGuru || !teacherName) {
      return NextResponse.json(
        { error: 'ID, kode guru, dan nama wajib diisi' },
        { status: 400 }
      );
    }

    const teacher = await prisma.$transaction(async (tx) => {
      const currentTeacher = await tx.teacher.findUnique({
        where: { id },
        include: {
          user: true,
          teachingAssignments: true,
        }
      });

      if (!currentTeacher) {
        throw new Error('TEACHER_NOT_FOUND');
      }

      let assignments = await resolveTeachingAssignments(tx, {
        teachingAssignments,
        mataPelajaran,
        tingkatKelas,
        jurusan,
      });

      if (assignments.length === 0 && currentTeacher.teachingAssignments.length > 0) {
        assignments = currentTeacher.teachingAssignments.map((assignment) => ({
          subject: assignment.subject,
          className: assignment.className,
          classLevel: assignment.classLevel,
          majorCode: assignment.majorCode,
          majorName: assignment.majorName || null,
        }));
      }

      if (assignments.length === 0) {
        assignments = await resolveTeachingAssignments(tx, {
          mataPelajaran: currentTeacher.mataPelajaran,
          tingkatKelas: splitCsv(currentTeacher.tingkatKelas),
          jurusan: splitCsv(currentTeacher.jurusan),
        });
      }

      const teacherSummary = buildTeacherSummaryFromAssignments(assignments);

      const { user } = await resolveUserForTeacher(tx, {
        teacherId: currentTeacher.id,
        currentUserId: currentTeacher.userId,
        kodeGuru: normalizedKodeGuru,
        teacherName,
        birthDate: normalizedTanggalLahir,
        email,
        nip: normalizedNip,
      });

      const updatedTeacher = await tx.teacher.update({
        where: { id },
        data: { 
          userId: user.id,
          kodeGuru: normalizedKodeGuru, 
          tanggalLahir: normalizedTanggalLahir, 
          mataPelajaran: teacherSummary.mataPelajaran,
          jenisKelamin, 
          tingkatKelas: normalizeArrayToCsv(teacherSummary.tingkatKelas),
          jurusan: normalizeArrayToCsv(teacherSummary.jurusan)
        },
        include: {
          user: true,
          teachingAssignments: true,
        }
      });

      await tx.teachingAssignment.deleteMany({
        where: { teacherId: id },
      });

      if (assignments.length > 0) {
        await tx.teachingAssignment.createMany({
          data: assignments.map((assignment) => ({
            teacherId: id,
            subject: assignment.subject,
            className: assignment.className,
            classLevel: assignment.classLevel,
            majorCode: assignment.majorCode,
            majorName: assignment.majorName,
          })),
        });
      }

      if (currentTeacher.userId !== user.id) {
        const previousUser = await tx.user.findUnique({
          where: { id: currentTeacher.userId },
          include: {
            teacher: true,
            _count: {
              select: {
                grades: true,
                journals: true,
              },
            },
          },
        });

        if (
          previousUser &&
          !previousUser.teacher &&
          previousUser.role !== 'ADMIN' &&
          previousUser._count.grades === 0 &&
          previousUser._count.journals === 0
        ) {
          await tx.user.delete({
            where: { id: previousUser.id },
          });
        }
      }

      await tx.user.update({
        where: { id: updatedTeacher.userId },
        data: {
          name: teacherName,
          email: buildTeacherIdentityEmail({
            birthDate: normalizedTanggalLahir,
            nip: normalizedNip,
            email,
            kodeGuru: normalizedKodeGuru,
          }),
          nip: normalizedNip
        }
      });

      return tx.teacher.findUnique({
        where: { id },
        include: { user: true, teachingAssignments: true }
      });
    });
    
    return NextResponse.json(mapTeacherForClient(teacher));
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data guru.' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'TEACHER_NOT_FOUND') {
      return NextResponse.json({ error: 'Data guru tidak ditemukan.' }, { status: 404 });
    }
    console.error('Error updating teacher:', error);

    if (error instanceof Error && error.message === 'USER_ALREADY_LINKED_TO_OTHER_TEACHER') {
      return NextResponse.json(
        { error: 'Akun user dengan NIP/email ini sudah terhubung ke data guru lain.' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith('CLASS_NOT_FOUND:')) {
      return NextResponse.json(
        { error: `Kelas untuk penugasan tidak ditemukan: ${error.message.replace('CLASS_NOT_FOUND:', '').trim()}` },
        { status: 400 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Kode guru, NIP, atau email sudah terdaftar.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Gagal memperbarui data guru' },
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

    const teachers = await prisma.teacher.findMany({
      where: { id: { in: ids } },
      include: {
        user: true,
        _count: {
          select: {
            grades: true,
            journals: true,
          },
        },
      },
    });

    if (teachers.length !== ids.length) {
      return NextResponse.json(
        { error: 'Sebagian data guru tidak ditemukan.' },
        { status: 404 }
      );
    }

    const adminTeacher = teachers.find((teacher) => teacher.user.role === 'ADMIN');
    if (adminTeacher) {
      return NextResponse.json(
        { error: `Akun guru ${adminTeacher.user.name || adminTeacher.kodeGuru} yang berperan admin tidak boleh dihapus lewat menu ini.` },
        { status: 400 }
      );
    }

    const teacherWithHistory = teachers.find(
      (teacher) => teacher._count.grades > 0 || teacher._count.journals > 0
    );
    if (teacherWithHistory) {
      return NextResponse.json(
        {
          error: `Guru ${teacherWithHistory.user.name || teacherWithHistory.kodeGuru} sudah memiliki histori nilai atau jurnal dan tidak bisa dihapus langsung.`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.deleteMany({
        where: { id: { in: ids } }
      });

      await tx.user.deleteMany({
        where: {
          id: {
            in: teachers.map((teacher) => teacher.userId),
          },
        },
      });
    });
    
    return NextResponse.json({
      message: ids.length === 1 ? 'Guru berhasil dihapus' : `${ids.length} guru berhasil dihapus`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data guru.' }, { status: 403 });
    }
    console.error('Error deleting teacher:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data guru' },
      { status: 500 }
    );
  }
}
