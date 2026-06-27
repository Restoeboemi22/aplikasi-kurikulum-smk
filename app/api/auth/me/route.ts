import { NextRequest, NextResponse } from "next/server";
import { buildSessionProfile, getServerSession } from "@/lib/server-session";

export async function GET(request: NextRequest) {
  const session = getServerSession(request);

  if (!session) {
    return NextResponse.json({ error: "Session tidak ditemukan." }, { status: 401 });
  }

  const profile = await buildSessionProfile(session);

  return NextResponse.json({ user: profile });
}
