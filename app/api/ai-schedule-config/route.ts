import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDefaultAiScheduleConfig, safeParseJson } from "@/lib/ai-schedule";
import { requireRole, requireSession } from "@/lib/server-session";

const mapConfig = (item: any) => ({
  academicYear: item.academicYear,
  semester: item.semester || "Ganjil",
  scheduleTeachers: safeParseJson(item.scheduleTeachersJson, []),
  editableDayTimeSlots: safeParseJson(item.dayTimeSlotsJson, getDefaultAiScheduleConfig().editableDayTimeSlots),
  religiousRestrictions: safeParseJson(item.religiousRestrictionsJson, []),
  priorities: safeParseJson(item.prioritiesJson, getDefaultAiScheduleConfig().priorities),
});

export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const existing = await prisma.aIScheduleConfig.findUnique({
      where: { scope: "default" },
    });

    if (!existing) {
      return NextResponse.json(getDefaultAiScheduleConfig());
    }

    return NextResponse.json(mapConfig(existing));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    console.error("Error fetching AI schedule config:", error);
    return NextResponse.json({ error: "Gagal mengambil konfigurasi Jadwal AI." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireRole(request, ["ADMIN"]);
    const body = await request.json();
    const defaults = getDefaultAiScheduleConfig();

    const payload = {
      academicYear: String(body.academicYear || defaults.academicYear).trim() || defaults.academicYear,
      semester: String(body.semester || defaults.semester).trim() || defaults.semester,
      scheduleTeachersJson: JSON.stringify(Array.isArray(body.scheduleTeachers) ? body.scheduleTeachers : []),
      dayTimeSlotsJson: JSON.stringify(body.editableDayTimeSlots || defaults.editableDayTimeSlots),
      religiousRestrictionsJson: JSON.stringify(Array.isArray(body.religiousRestrictions) ? body.religiousRestrictions : []),
      prioritiesJson: JSON.stringify(body.priorities || defaults.priorities),
    };

    const saved = await prisma.aIScheduleConfig.upsert({
      where: { scope: "default" },
      update: payload,
      create: {
        scope: "default",
        ...payload,
      },
    });

    return NextResponse.json(mapConfig(saved));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Hanya admin yang boleh mengubah konfigurasi Jadwal AI." }, { status: 403 });
    }
    console.error("Error saving AI schedule config:", error);
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi Jadwal AI." }, { status: 500 });
  }
}
