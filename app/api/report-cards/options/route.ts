import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/server-session";
import { canAccessReportClass, matchesReportMajorCode, resolveReportViewerAccess } from "@/lib/report-card";
import { getReportProfile } from "@/lib/report-profiles";

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const viewer = await resolveReportViewerAccess(session);
    const { searchParams } = new URL(request.url);
    const className = searchParams.get("className");
    const reportMajorCode = searchParams.get("reportMajorCode");
    const reportProfile = getReportProfile(reportMajorCode);

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

    const classWhere =
      viewer.role === "ADMIN"
        ? {}
        : {
            className: {
              in: viewer.allowedClassNames,
            },
          };

    const rawClasses = await prisma.classMajor.findMany({
      where: {
        ...classWhere,
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
      orderBy: {
        className: "asc",
      },
    });

    const classes = reportProfile
      ? rawClasses.filter((item) =>
          matchesReportMajorCode(reportProfile.majorCode, {
            className: item.className,
            majorCode: item.majorCode,
            majorName: item.majorName,
          })
        )
      : rawClasses;

    if (className && !canAccessReportClass(viewer, className)) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke kelas tersebut." },
        { status: 403 }
      );
    }

    if (className && reportProfile && !classes.some((item) => item.className === className)) {
      return NextResponse.json(
        { error: `Kelas yang dipilih tidak termasuk jalur raport ${reportProfile.majorCode}.` },
        { status: 400 }
      );
    }

    const students = className
      ? await prisma.student.findMany({
          where: {
            className,
          },
          orderBy: [{ name: "asc" }],
        })
      : [];

    return NextResponse.json({
      viewer: {
        role: viewer.role,
        isHomeroomTeacher: viewer.isHomeroomTeacher,
        allowedClassNames: viewer.allowedClassNames,
      },
      classes: classes.map((item) => ({
        id: item.id,
        className: item.className,
        grade: item.grade,
        majorCode: item.majorCode,
        majorName: item.majorName,
        room: item.room,
        homeroomTeacher: item.homeroomTeacherProfile?.user?.name || item.homeroomTeacher || "-",
      })),
      students,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    console.error("Error fetching report card options:", error);
    return NextResponse.json(
      { error: "Gagal memuat opsi Cetak Raport." },
      { status: 500 }
    );
  }
}
