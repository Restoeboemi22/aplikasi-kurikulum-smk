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
        filters.teacherId = teacher.id;
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
          { name: commonSubject },
          { code: commonSubject },
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
            subject: commonSubject,
            ...(commonClassName ? { className: commonClassName } : {}),
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
        if (assignment.subject !== commonSubject) return false;
        if (commonClassName) {
          return assignment.className === commonClassName;
        }
        return assignment.classLevel === commonClassLevel && assignment.majorCode === commonMajor;
      });

      if (!matchedAssignment) {
        return NextResponse.json(
          { error: 'Guru tidak memiliki penugasan untuk kombinasi mata pelajaran dan kelas tersebut.' },
          { status: 403 }
        );
      }
    }

    // Process saving in a single atomic transaction
    const results = await prisma.$transaction(async (tx) => {
      // Preload student IDs
      const studentIds = items.map((it) => it.studentId).filter(Boolean) as string[];
      const studentsById = new Map();
      if (studentIds.length > 0) {
        const found = await tx.student.findMany({
          where: { id: { in: studentIds } },
        });
        found.forEach((s) => studentsById.set(s.id, s));
      }

      // Preload existing grades for these students
      const existingGrades = await tx.grade.findMany({
        where: {
          studentId: { in: studentIds.length > 0 ? studentIds : undefined },
          subject: commonSubject,
          semester: commonSemester,
          jenisPenilaian: commonJenisPenilaian,
          classLevel: commonClassLevel,
          major: commonMajor,
        },
      });

      const gradeByStudentId = new Map(existingGrades.map((g) => [g.studentId, g]));
      const savedList = [];

      for (const item of items) {
        const sName = item.studentName?.trim();
        if (!sName && !item.studentId) continue;

        let student = item.studentId ? studentsById.get(item.studentId) : null;
        if (!student && sName) {
          student = await tx.student.findFirst({
            where: {
              name: sName,
              ...(commonClassName
                ? { className: commonClassName }
                : { className: { startsWith: `${commonClassLevel} ` } }),
            },
          });
        }

        if (!student) continue;

        // Anti cross-class validation: ensure student actually belongs to the target class
        if (commonClassName && student.className && student.className.trim() !== commonClassName.trim()) {
          console.warn(`[Anti-Leak] Skipping student ${student.name} (${student.className}) because target class is ${commonClassName}`);
          continue;
        }

        // Anti cross-level validation: ensure student's class matches target level
        if (commonClassLevel && student.className && !student.className.trim().startsWith(commonClassLevel + ' ')) {
          console.warn(`[Anti-Leak] Skipping student ${student.name} (${student.className}) because target level is ${commonClassLevel}`);
          continue;
        }

        const realClassLevel = extractClassLevel(student.className) || commonClassLevel;

        const existing = gradeByStudentId.get(student.id) || await tx.grade.findFirst({
          where: {
            studentId: student.id,
            subject: commonSubject,
            semester: commonSemester,
            jenisPenilaian: commonJenisPenilaian,
          },
        });

        const n1 = item.nilai1 ? String(item.nilai1).trim() : null;
        const n2 = item.nilai2 ? String(item.nilai2).trim() : null;
        const n3 = item.nilai3 ? String(item.nilai3).trim() : null;
        const nAkhir = item.nilaiAkhir ? String(item.nilaiAkhir).trim() : null;

        if (existing) {
          const updated = await tx.grade.update({
            where: { id: existing.id },
            data: {
              nilai1: n1 || null,
              nilai2: n2 || null,
              nilai3: n3 || null,
              nilaiAkhir: nAkhir || null,
              classLevel: realClassLevel,
              major: commonMajor,
              teacherId: teacher.id,
              userId: teacher.userId,
            },
          });
          savedList.push(updated);
        } else {
          const created = await tx.grade.create({
            data: {
              studentId: student.id,
              subject: commonSubject,
              classLevel: realClassLevel,
              major: commonMajor,
              jenisPenilaian: commonJenisPenilaian,
              semester: commonSemester,
              nilai1: n1 || null,
              nilai2: n2 || null,
              nilai3: n3 || null,
              nilaiAkhir: nAkhir || null,
              teacherId: teacher.id,
              userId: teacher.userId,
            },
          });
          savedList.push(created);
        }
      }

      return savedList;
    });

    if (isBatch) {
      return NextResponse.json({
        message: `Berhasil menyimpan nilai untuk ${results.length} siswa.`,
        savedCount: results.length,
      }, { status: 200 });
    }

    return NextResponse.json(results[0] || null, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error saving grade:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal menyimpan nilai' }, { status: 500 });
  }
}
