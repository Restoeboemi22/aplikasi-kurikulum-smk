import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, requireSession } from '@/lib/server-session';
import { DEFAULT_SUBJECTS } from '@/lib/default-subjects';

export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' }
    });
    const orderByCode = new Map(DEFAULT_SUBJECTS.map((subject, index) => [subject.code, index]));
    const orderByName = new Map(DEFAULT_SUBJECTS.map((subject, index) => [subject.name, index]));

    const sortedSubjects = [...subjects].sort((a, b) => {
      const aOrder = orderByCode.get(a.code) ?? orderByName.get(a.name) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = orderByCode.get(b.code) ?? orderByName.get(b.name) ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return a.name.localeCompare(b.name, "id");
    });

    return NextResponse.json(sortedSubjects);
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

    const subject = await prisma.subject.update({
      where: { id },
      data: { code, name }
    });
    
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
