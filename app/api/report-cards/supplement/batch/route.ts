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

// GET: Ambil seluruh data siswa dan data pelengkap raport (absensi, kepribadian, catatan) satu kelas
export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const viewer = await resolveReportViewerAccess(session);
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("className");
    const academicYear = searchParams.get("academicYear");
    const semester = searchParams.get("semester");

    if (!viewer) {
      return NextResponse.json(
        { error: "Guru aktif pada session tidak ditemukan di database admin." },
        { status: 403 }
      );
    }

    if (viewer.role === "TEACHER" && !viewer.isHomeroomTeacher) {
      return NextResponse.json(
        { error: "Menu ini hanya dapat diakses oleh admin atau guru yang menjadi wali kelas." },
        { status: 403 }
      );
    }

    if (!className || !academicYear || !semester) {
      return NextResponse.json(
        { error: "Parameter kelas, tahun ajaran, dan semester wajib diisi." },
        { status: 400 }
      );
    }

    if (!canAccessReportClass(viewer, className)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke data kelas tersebut." },
        { status: 403 }
      );
    }

    // 1. Ambil data kelas
    const classMajor = await prisma.classMajor.findFirst({
      where: { className },
      include: {
        homeroomTeacherProfile: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    // 2. Ambil seluruh siswa pada kelas tersebut
    const students = await prisma.student.findMany({
      where: { className },
      select: {
        id: true,
        name: true,
        nis: true,
        nisn: true,
        gender: true,
      },
      orderBy: [{ name: "asc" }],
    });

    // 3. Ambil seluruh data ReportCardSupplement yang SUDAH diinput sebelumnya untuk kelas ini
    const existingSupplements = await prisma.reportCardSupplement.findMany({
      where: {
        className,
        academicYear,
        semester,
      },
    });

    const supplementMap = new Map<string, (typeof existingSupplements)[0]>();
    for (const sup of existingSupplements) {
      supplementMap.set(sup.studentId, sup);
    }

    // Ambil data pengesahan bersama (Kota, Tanggal, Wali Kelas, Kepala Sekolah)
    const latestSupplement = existingSupplements.find((s) => s.reportDate || s.homeroomSignatureName);

    const commonPengesahan = {
      reportCity: latestSupplement?.reportCity || "Mojokerto",
      reportDate: latestSupplement?.reportDate || "",
      homeroomSignatureName:
        latestSupplement?.homeroomSignatureName ||
        classMajor?.homeroomTeacherProfile?.user?.name ||
        classMajor?.homeroomTeacher ||
        "",
      homeroomSignatureTitle: latestSupplement?.homeroomSignatureTitle || "Wali Kelas",
      principalSignatureName:
        latestSupplement?.principalSignatureName || "Moh. Junaedi Hartanto, S.Pd",
      principalSignatureTitle: latestSupplement?.principalSignatureTitle || "Kepala Sekolah",
      principalNip: latestSupplement?.principalNip || "",
    };

    // 4. Gabungkan data siswa dengan data pelengkap
    const items = students.map((student) => {
      const sup = supplementMap.get(student.id);

      return {
        studentId: student.id,
        name: student.name,
        nis: student.nis || "-",
        nisn: student.nisn || "-",
        gender: student.gender || "-",
        // Absensi
        sakit: sup ? sup.sakit : 0,
        izin: sup ? sup.izin : 0,
        alpha: sup ? sup.alpha : 0,
        // Pengembangan Diri
        developmentPramuka: sup ? sup.developmentPramuka || "-" : "-",
        developmentSholatDhuha: sup ? sup.developmentSholatDhuha || "-" : "-",
        // Kepribadian
        personalityAkhlak: sup ? sup.personalityAkhlak || "-" : "-",
        personalityKerajinan: sup ? sup.personalityKerajinan || "-" : "-",
        personalityKerapian: sup ? sup.personalityKerapian || "-" : "-",
        // Catatan Wali Kelas
        homeroomNote: sup ? sup.homeroomNote || "" : "",
        // Status
        isFinalized: sup ? sup.isFinalized : false,
        isFilled: Boolean(
          sup &&
            (sup.sakit > 0 ||
              sup.izin > 0 ||
              sup.alpha > 0 ||
              (sup.developmentPramuka && sup.developmentPramuka !== "-") ||
              (sup.personalityAkhlak && sup.personalityAkhlak !== "-") ||
              (sup.homeroomNote && sup.homeroomNote.trim() !== ""))
        ),
      };
    });

    return NextResponse.json({
      className,
      academicYear,
      semester,
      totalStudents: students.length,
      filledCount: items.filter((i) => i.isFilled).length,
      commonPengesahan,
      items,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error in GET /api/report-cards/supplement/batch:", error);
    return NextResponse.json({ error: "Gagal memuat data pelengkap raport" }, { status: 500 });
  }
}

// POST: Simpan massal (bulk save) data absensi, kepribadian, dan catatan wali kelas untuk seluruh siswa
export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const viewer = await resolveReportViewerAccess(session);
    const body = await request.json();
    const { className, academicYear, semester, items, commonPengesahan } = body;

    if (!viewer) {
      return NextResponse.json(
        { error: "Guru aktif pada session tidak ditemukan di database admin." },
        { status: 403 }
      );
    }

    if (viewer.role === "TEACHER" && !viewer.isHomeroomTeacher) {
      return NextResponse.json(
        { error: "Menu ini hanya dapat diakses oleh admin atau guru yang menjadi wali kelas." },
        { status: 403 }
      );
    }

    if (!className || !academicYear || !semester || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Data kelas, tahun ajaran, semester, dan daftar siswa wajib dikirim." },
        { status: 400 }
      );
    }

    if (!canAccessReportClass(viewer, className)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses untuk mengubah data kelas tersebut." },
        { status: 403 }
      );
    }

    const normalizedReportCity = String(commonPengesahan?.reportCity || "Mojokerto").trim();
    const normalizedReportDate = String(commonPengesahan?.reportDate || "").trim();
    const normalizedHomeroomName = String(commonPengesahan?.homeroomSignatureName || "").trim();
    const normalizedHomeroomTitle =
      String(commonPengesahan?.homeroomSignatureTitle || "Wali Kelas").trim();
    const normalizedPrincipalName = String(
      commonPengesahan?.principalSignatureName || "Moh. Junaedi Hartanto, S.Pd"
    ).trim();
    const normalizedPrincipalTitle =
      String(commonPengesahan?.principalSignatureTitle || "Kepala Sekolah").trim();
    const normalizedPrincipalNip = String(commonPengesahan?.principalNip || "").trim();

    // Jalankan upsert massal menggunakan Prisma transaction
    const updatePromises = items.map((item: any) =>
      prisma.reportCardSupplement.upsert({
        where: {
          studentId_academicYear_semester: {
            studentId: item.studentId,
            academicYear,
            semester,
          },
        },
        update: {
          className,
          sakit: normalizeCount(item.sakit),
          izin: normalizeCount(item.izin),
          alpha: normalizeCount(item.alpha),
          developmentPramuka: normalizeScoreText(item.developmentPramuka),
          developmentSholatDhuha: normalizeScoreText(item.developmentSholatDhuha),
          personalityAkhlak: normalizeScoreText(item.personalityAkhlak),
          personalityKerajinan: normalizeScoreText(item.personalityKerajinan),
          personalityKerapian: normalizeScoreText(item.personalityKerapian),
          homeroomNote: String(item.homeroomNote || "").trim(),
          reportCity: normalizedReportCity,
          reportDate: normalizedReportDate,
          homeroomSignatureName: normalizedHomeroomName,
          homeroomSignatureTitle: normalizedHomeroomTitle,
          principalSignatureName: normalizedPrincipalName,
          principalSignatureTitle: normalizedPrincipalTitle,
          principalNip: normalizedPrincipalNip,
          updatedByUserId: session.uid,
        },
        create: {
          studentId: item.studentId,
          academicYear,
          semester,
          className,
          sakit: normalizeCount(item.sakit),
          izin: normalizeCount(item.izin),
          alpha: normalizeCount(item.alpha),
          developmentPramuka: normalizeScoreText(item.developmentPramuka),
          developmentSholatDhuha: normalizeScoreText(item.developmentSholatDhuha),
          personalityAkhlak: normalizeScoreText(item.personalityAkhlak),
          personalityKerajinan: normalizeScoreText(item.personalityKerajinan),
          personalityKerapian: normalizeScoreText(item.personalityKerapian),
          homeroomNote: String(item.homeroomNote || "").trim(),
          reportCity: normalizedReportCity,
          reportDate: normalizedReportDate,
          homeroomSignatureName: normalizedHomeroomName,
          homeroomSignatureTitle: normalizedHomeroomTitle,
          principalSignatureName: normalizedPrincipalName,
          principalSignatureTitle: normalizedPrincipalTitle,
          principalNip: normalizedPrincipalNip,
          updatedByUserId: session.uid,
        },
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({
      success: true,
      updatedCount: items.length,
      message: `Berhasil menyimpan data pelengkap raport untuk ${items.length} siswa.`,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error in POST /api/report-cards/supplement/batch:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data pelengkap raport secara massal" },
      { status: 500 }
    );
  }
}
