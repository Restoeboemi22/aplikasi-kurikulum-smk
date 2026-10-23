import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/server-session';
import { isSubjectActiveInLevel, extractClassLevel } from '@/lib/subject-groups';

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
    const viewerScope = searchParams.get('viewerScope');

    const filters: any = {};
    if (classLevel) filters.classLevel = classLevel;
    if (major) filters.major = major;
    if (jenisPenilaian) filters.jenisPenilaian = jenisPenilaian;
    if (subject) filters.subject = subject;
    if (semester) filters.semester = semester;
    if (className) {
      filters.student = {
        className,
      };
    }

    if (session.role === 'ADMIN') {
      if (teacherId) filters.teacherId = teacherId;
    } else if (session.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { userId: session.uid },
            session.nip ? { user: { nip: session.nip } } : null,
          ].filter(Boolean) as any[],
        },
        include: {
          teachingAssignments: true,
          homeroomClasses: {
            select: {
              className: true,
            },
          },
        },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: 'Guru aktif pada session tidak ditemukan di database admin.' },
          { status: 403 }
        );
      }

      const homeroomClassNames = teacher.homeroomClasses.map((item) => item.className.trim().toUpperCase());

      if (viewerScope === 'homeroom-summary') {
        if (homeroomClassNames.length === 0) {
          return NextResponse.json(
            { error: 'Menu Master Nilai hanya dapat diakses oleh guru yang menjadi wali kelas.' },
            { status: 403 }
          );
        }

        if (!className) {
          return NextResponse.json(
            { error: 'Kelas wali wajib dipilih untuk menampilkan Master Nilai.' },
            { status: 400 }
          );
        }

        const requestedClassName = className.trim().toUpperCase();
        if (!homeroomClassNames.includes(requestedClassName)) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses ke kelas tersebut.' },
            { status: 403 }
          );
        }
      } else {
        if (subject) {
          const hasAssignment = teacher.teachingAssignments.some((assignment) => {
            if (assignment.subject.trim().toUpperCase() !== subject.trim().toUpperCase()) return false;
            if (className) {
              return assignment.className.trim().toUpperCase() === className.trim().toUpperCase();
            }
            if (classLevel && major) {
              return assignment.classLevel.trim().toUpperCase() === classLevel.trim().toUpperCase() &&
                     assignment.majorCode.trim().toUpperCase() === major.trim().toUpperCase();
            }
            return true;
          });

          if (!hasAssignment) {
            return NextResponse.json(
              { error: 'Anda tidak memiliki penugasan mengajar untuk mata pelajaran dan kelas ini.' },
              { status: 403 }
            );
          }
          // Guru memiliki penugasan sah untuk mapel/kelas ini.
          // Tampilkan semua nilai siswa untuk mapel & kelas tersebut tanpa terhalang filter teacherId
        } else {
          filters.teacherId = teacher.id;
        }
      }
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

// POST a new grade or update existing (supports both single item and batch items)
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();

    // Determine if this is a batch request or single request
    const isBatch = Boolean(body.items && Array.isArray(body.items));
    const items: Array<{
      studentId?: string;
      studentName: string;
      className?: string;
      classLevel?: string;
      major?: string;
      subject?: string;
      semester?: string;
      jenisPenilaian?: any;
      nilai1?: string | null;
      nilai2?: string | null;
      nilai3?: string | null;
      nilaiAkhir?: string | null;
    }> = isBatch ? body.items : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data nilai yang dikirim.' }, { status: 400 });
    }

    const commonClassLevel = body.classLevel || items[0]?.classLevel;
    const commonMajor = body.major || items[0]?.major;
    const commonClassName = body.className || items[0]?.className;
    const commonSubject = body.subject || items[0]?.subject;
    const commonSemester = body.semester || items[0]?.semester || 'Ganjil 2026/2027';
    const commonJenisPenilaian = body.jenisPenilaian || items[0]?.jenisPenilaian;

    if (!commonClassLevel || !commonMajor || !commonJenisPenilaian || !commonSubject) {
      return NextResponse.json(
        { error: 'Data kelas, jurusan, mapel, dan jenis penilaian wajib diisi.' },
        { status: 400 }
      );
    }

    if (!commonSemester || !isSemesterLabelValid(commonSemester)) {
      return NextResponse.json(
        { error: 'Semester dan tahun ajaran tidak valid.' },
        { status: 400 }
      );
    }

    // Validate that the subject is active for this class level
    const dbSubject = await prisma.subject.findFirst({
      where: {
        OR: [
          { name: { equals: commonSubject, mode: 'insensitive' } },
          { code: { equals: commonSubject, mode: 'insensitive' } },
        ],
      },
    });

    if (dbSubject && !isSubjectActiveInLevel(dbSubject.levels, commonClassLevel)) {
      return NextResponse.json(
        {
          error: `Mata pelajaran "${commonSubject}" tidak diajarkan pada jenjang Kelas ${commonClassLevel} sesuai struktur kurikulum.`,
        },
        { status: 400 }
      );
    }

    // Resolve teacher
    let teacher = null;
    if (session.role === 'ADMIN') {
      if (body.teacherId) {
        teacher = await prisma.teacher.findUnique({
          where: { id: body.teacherId },
          include: { user: true, teachingAssignments: true },
        });
      }
      if (!teacher) {
        // Find teacher assigned to this subject and class
        const assignment = await prisma.teachingAssignment.findFirst({
          where: {
            subject: { equals: commonSubject, mode: 'insensitive' },
            ...(commonClassName ? { className: { equals: commonClassName, mode: 'insensitive' } } : {}),
          },
          include: { teacher: { include: { user: true, teachingAssignments: true } } },
        });
        teacher = assignment?.teacher || await prisma.teacher.findFirst({ include: { user: true, teachingAssignments: true } });
      }
      if (!teacher) {
        return NextResponse.json(
          { error: 'Belum ada data guru di sistem admin untuk dikaitkan dengan nilai.' },
          { status: 400 }
        );
      }
    } else {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { userId: session.uid },
            session.nip ? { user: { nip: session.nip } } : null,
            session.name ? { user: { name: session.name } } : null,
          ].filter(Boolean) as any[],
        },
        include: { user: true, teachingAssignments: true },
      });

      if (!teacher) {
        return NextResponse.json(
          { error: 'Guru aktif pada session tidak ditemukan di database admin.' },
          { status: 403 }
        );
      }

      if (teacher.user.role !== 'TEACHER') {
        return NextResponse.json(
          { error: 'Hanya akun guru yang boleh menyimpan nilai.' },
          { status: 403 }
        );
      }

      const matchedAssignment = teacher.teachingAssignments.find((assignment) => {
        if (assignment.subject.trim().toUpperCase() !== commonSubject.trim().toUpperCase()) return false;
        if (commonClassName) {
          return assignment.className.trim().toUpperCase() === commonClassName.trim().toUpperCase();
        }
        return assignment.classLevel.trim().toUpperCase() === commonClassLevel.trim().toUpperCase() &&
               assignment.majorCode.trim().toUpperCase() === commonMajor.trim().toUpperCase();
      });

      if (!matchedAssignment) {
        return NextResponse.json(
          { error: 'Guru tidak memiliki penugasan untuk kombinasi mata pelajaran dan kelas tersebut.' },
          { status: 403 }
        );
      }
    }

    // 1. Preload student data in memory for fast O(1) resolution without N+1 queries
    const studentIds = items.map((it) => it.studentId).filter(Boolean) as string[];
    const studentsById = new Map();
    if (studentIds.length > 0) {
      const found = await prisma.student.findMany({
        where: { id: { in: studentIds } },
      });
      found.forEach((s) => studentsById.set(s.id, s));
    }

    const classStudentsByName = new Map();
    if (commonClassName) {
      const classStudents = await prisma.student.findMany({
        where: { className: commonClassName },
      });
      classStudents.forEach((s) => classStudentsByName.set(s.name.trim().toUpperCase(), s));
    }

    // 2. Validate and prepare items
    const validItems: Array<{
      studentId: string;
      realClassLevel: string;
      n1: string | null;
      n2: string | null;
      n3: string | null;
      nAkhir: string | null;
    }> = [];

    for (const item of items) {
      const sName = item.studentName?.trim();
      if (!sName && !item.studentId) continue;

      let student = item.studentId ? studentsById.get(item.studentId) : null;
      if (!student && sName) {
        student = classStudentsByName.get(sName.toUpperCase());
      }

      if (!student) continue;

      // Anti cross-class validation: ensure student actually belongs to the target class
      if (commonClassName && student.className && student.className.trim().toUpperCase() !== commonClassName.trim().toUpperCase()) {
        console.warn(`[Anti-Leak] Skipping student ${student.name} (${student.className}) because target class is ${commonClassName}`);
        continue;
      }

      // Anti cross-level validation: ensure student's class matches target level
      if (commonClassLevel && student.className && !student.className.trim().toUpperCase().startsWith(commonClassLevel.toUpperCase() + ' ')) {
        console.warn(`[Anti-Leak] Skipping student ${student.name} (${student.className}) because target level is ${commonClassLevel}`);
        continue;
      }

      const realClassLevel = extractClassLevel(student.className) || commonClassLevel;
      const n1 = item.nilai1 ? String(item.nilai1).trim() : null;
      const n2 = item.nilai2 ? String(item.nilai2).trim() : null;
      const n3 = item.nilai3 ? String(item.nilai3).trim() : null;
      const nAkhir = item.nilaiAkhir ? String(item.nilaiAkhir).trim() : null;

      validItems.push({
        studentId: student.id,
        realClassLevel,
        n1,
        n2,
        n3,
        nAkhir,
      });
    }

    // 3. Execute atomic upserts in concurrent batches (chunkSize 10)
    // This avoids transaction timeout (P2028) on large classes while protecting DB connection pool
    const chunkSize = 10;
    const savedList = [];

    for (let i = 0; i < validItems.length; i += chunkSize) {
      const chunk = validItems.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map((item) =>
          prisma.grade.upsert({
            where: {
              studentId_subject_semester_jenisPenilaian: {
                studentId: item.studentId,
                subject: commonSubject,
                semester: commonSemester,
                jenisPenilaian: commonJenisPenilaian,
              },
            },
            update: {
              nilai1: item.n1,
              nilai2: item.n2,
              nilai3: item.n3,
              nilaiAkhir: item.nAkhir,
              classLevel: item.realClassLevel,
              major: commonMajor,
              teacherId: teacher.id,
              userId: teacher.userId,
            },
            create: {
              studentId: item.studentId,
              subject: commonSubject,
              classLevel: item.realClassLevel,
              major: commonMajor,
              jenisPenilaian: commonJenisPenilaian,
              semester: commonSemester,
              nilai1: item.n1,
              nilai2: item.n2,
              nilai3: item.n3,
              nilaiAkhir: item.nAkhir,
              teacherId: teacher.id,
              userId: teacher.userId,
            },
          })
        )
      );
      savedList.push(...chunkResults);
    }

    if (isBatch) {
      return NextResponse.json({
        message: `Berhasil menyimpan nilai untuk ${savedList.length} siswa.`,
        savedCount: savedList.length,
      }, { status: 200 });
    }

    return NextResponse.json(savedList[0] || null, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error saving grade:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menyimpan nilai' }, { status: 500 });
  }
}
