import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/server-session";

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const majorCode = searchParams.get("majorCode");

    const classes = await prisma.classMajor.findMany({
      where: majorCode ? { majorCode } : {},
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

    return NextResponse.json({
      classes: classes.map((item) => ({
        id: item.id,
        className: item.className,
        grade: item.grade,
        majorCode: item.majorCode,
        majorName: item.majorName,
        room: item.room,
        homeroomTeacher: item.homeroomTeacherProfile?.user?.name || item.homeroomTeacher || "-",
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Hanya admin yang boleh mengakses Cetak DKN." },
        { status: 403 }
      );
    }

    console.error("Error fetching DKN options:", error);
    return NextResponse.json({ error: "Gagal memuat opsi Cetak DKN." }, { status: 500 });
  }
}
