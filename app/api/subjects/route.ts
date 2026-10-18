import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, requireSession } from '@/lib/server-session';
import { DEFAULT_SUBJECTS } from '@/lib/default-subjects';
import { getSubjectGroup, sortSubjectsWithGroup } from '@/lib/subject-groups';

export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' }
    });

    const sortedSubjects = sortSubjectsWithGroup(subjects);
    const enriched = sortedSubjects.map((s) => {
      const grp = getSubjectGroup(s.name, s.code);
      return {
        ...s,
        groupCode: grp.code,
        groupName: grp.name,
        badgeLabel: grp.badgeLabel,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data mata pelajaran' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { code, name, defaults } = body;

    if (defaults) {
      const result = await prisma.subject.createMany({
        data: DEFAULT_SUBJECTS,
        skipDuplicates: true,
      });

      return NextResponse.json({
        message: `${result.count} mata pelajaran default berhasil ditambahkan.`,
        createdCount: result.count,
        totalDefaults: DEFAULT_SUBJECTS.length,
      });
    }
    
    if (!code || !name) {
      return NextResponse.json(
        { error: 'Kode dan nama mata pelajaran wajib diisi' },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: { code, name }
    });
    
    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data mata pelajaran.' }, { status: 403 });
    }
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Gagal membuat data mata pelajaran' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ['ADMIN']);
    const body = await request.json();
    const { id, code, name } = body;
    
    if (!id || !code || !name) {
      return NextResponse.json(
        { error: 'ID, kode, dan nama mata pelajaran wajib diisi' },
        { status: 400 }
      );
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Mata pelajaran tidak ditemukan' },
        { status: 404 }
      );
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: { code, name }
    });

    // Synchronize subject name change across existing operational records
    if (existingSubject.name !== name) {
      await Promise.allSettled([
        prisma.grade.updateMany({
          where: { subject: existingSubject.name },
          data: { subject: name },
        }),
        prisma.teachingObjective.updateMany({
          where: { subject: existingSubject.name },
          data: { subject: name },
        }),
        prisma.teachingAssignment.updateMany({
          where: { subject: existingSubject.name },
          data: { subject: name },
        }),
        prisma.schedule.updateMany({
          where: { subject: existingSubject.name },
          data: { subject: name },
        }),
        prisma.journal.updateMany({
          where: { subject: existingSubject.name },
          data: { subject: name },
        }),
        prisma.curriculumSubmission.updateMany({
          where: { subject: existingSubject.name },
          data: { subject: name },
        }),
      ]);
    }
    
    return NextResponse.json(subject);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data mata pelajaran.' }, { status: 403 });
    }
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui data mata pelajaran' },
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

    await prisma.subject.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Mata pelajaran berhasil dihapus' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Session login tidak valid.' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Hanya admin yang boleh mengubah data mata pelajaran.' }, { status: 403 });
    }
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data mata pelajaran' },
      { status: 500 }
    );
  }
}
