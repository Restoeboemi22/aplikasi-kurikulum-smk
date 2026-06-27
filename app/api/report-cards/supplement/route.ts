import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canAccessReportClass, resolveReportViewerAccess } from "@/lib/report-card";
import { requireSession } from "@/lib/server-session";

const normalizeScoreText = (value?: string | null) => {
  const normalized = (value || "").trim();
  return normalized || "-";
};

const normalizeCount = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
};

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const viewer = await resolveReportViewerAccess(session);
    const body = await request.json();
    const {
      action,
      studentId,
      academicYear,
      semester,
      sakit,
      izin,
      alpha,
      developmentPramuka,
      developmentSholatDhuha,
      personalityAkhlak,
      personalityKerajinan,
      personalityKerapian,
      homeroomNote,
      reportCity,
      reportDate,
      homeroomSignatureName,
      homeroomSignatureTitle,
      principalSignatureName,
      principalSignatureTitle,
      principalNip,
    } = body;

    if (!viewer) {
      return NextResponse.json(
        { error: "Guru aktif pada session tidak ditemukan di database admin." },
        { status: 403 }
      );
    }

    if (viewer.role === "TEACHER" && !viewer.isHomeroomTeacher) {
      return NextResponse.json(
        { error: "Menu Cetak Raport hanya dapat diakses oleh admin atau guru yang menjadi wali kelas." },
        { status: 403 }
      );
    }

    if (!studentId || !academicYear || !semester) {
      return NextResponse.json(
        { error: "Siswa, tahun ajaran, dan semester wajib diisi." },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        className: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
    }

    if (!canAccessReportClass(viewer, student.className)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk mengubah raport siswa pada kelas tersebut." },
        { status: 403 }
      );
    }

    const existing = await prisma.reportCardSupplement.findUnique({
      where: {
        studentId_academicYear_semester: {
          studentId,
          academicYear,
          semester,
        },
      },
    });

    if (action === "toggle-finalization") {
      const nextFinalized = !existing?.isFinalized;

      const supplement = await prisma.reportCardSupplement.upsert({
        where: {
          studentId_academicYear_semester: {
            studentId,
            academicYear,
            semester,
          },
        },
        update: {
          className: student.className || null,
          isFinalized: nextFinalized,
          finalizedAt: nextFinalized ? new Date() : null,
          finalizedByUserId: nextFinalized ? session.uid : null,
          updatedByUserId: session.uid,
        },
        create: {
          studentId,
          academicYear,
          semester,
          className: student.className || null,
          isFinalized: true,
          finalizedAt: new Date(),
          finalizedByUserId: session.uid,
          updatedByUserId: session.uid,
        },
      });

      return NextResponse.json(supplement);
    }

    if (existing?.isFinalized) {
      return NextResponse.json(
        { error: "Raport sudah difinalisasi. Batalkan finalisasi terlebih dahulu sebelum mengubah data." },
        { status: 400 }
      );
    }

    const supplement = await prisma.reportCardSupplement.upsert({
      where: {
        studentId_academicYear_semester: {
          studentId,
          academicYear,
          semester,
        },
      },
      update: {
        className: student.className || null,
        sakit: normalizeCount(sakit),
        izin: normalizeCount(izin),
        alpha: normalizeCount(alpha),
        developmentPramuka: normalizeScoreText(developmentPramuka),
        developmentSholatDhuha: normalizeScoreText(developmentSholatDhuha),
        personalityAkhlak: normalizeScoreText(personalityAkhlak),
        personalityKerajinan: normalizeScoreText(personalityKerajinan),
        personalityKerapian: normalizeScoreText(personalityKerapian),
        homeroomNote: String(homeroomNote || "").trim(),
        reportCity: String(reportCity || "").trim() || "Pacet",
        reportDate: String(reportDate || "").trim(),
        homeroomSignatureName: String(homeroomSignatureName || "").trim(),
        homeroomSignatureTitle: String(homeroomSignatureTitle || "").trim() || "Wali Kelas",
        principalSignatureName:
          String(principalSignatureName || "").trim() || "Kepala SMKS PACET",
        principalSignatureTitle:
          String(principalSignatureTitle || "").trim() || "Kepala Sekolah",
        principalNip: String(principalNip || "").trim(),
        updatedByUserId: session.uid,
      },
      create: {
        studentId,
        academicYear,
        semester,
        className: student.className || null,
        sakit: normalizeCount(sakit),
        izin: normalizeCount(izin),
        alpha: normalizeCount(alpha),
        developmentPramuka: normalizeScoreText(developmentPramuka),
        developmentSholatDhuha: normalizeScoreText(developmentSholatDhuha),
        personalityAkhlak: normalizeScoreText(personalityAkhlak),
        personalityKerajinan: normalizeScoreText(personalityKerajinan),
        personalityKerapian: normalizeScoreText(personalityKerapian),
        homeroomNote: String(homeroomNote || "").trim(),
        reportCity: String(reportCity || "").trim() || "Pacet",
        reportDate: String(reportDate || "").trim(),
        homeroomSignatureName: String(homeroomSignatureName || "").trim(),
        homeroomSignatureTitle: String(homeroomSignatureTitle || "").trim() || "Wali Kelas",
        principalSignatureName:
          String(principalSignatureName || "").trim() || "Kepala SMKS PACET",
        principalSignatureTitle:
          String(principalSignatureTitle || "").trim() || "Kepala Sekolah",
        principalNip: String(principalNip || "").trim(),
        updatedByUserId: session.uid,
      },
    });

    return NextResponse.json(supplement);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    console.error("Error saving report supplement:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data pelengkap raport." },
      { status: 500 }
    );
  }
}
