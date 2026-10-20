import { NextRequest, NextResponse } from "next/server";
import {
  applySessionCookie,
  buildSessionProfile,
  createSessionToken,
  getServerSession,
} from "@/lib/server-session";

export async function GET(request: NextRequest) {
  const session = getServerSession(request);

  if (!session) {
    return NextResponse.json({ error: "Session tidak ditemukan." }, { status: 401 });
  }

  const profile = await buildSessionProfile(session);

  const response = NextResponse.json({ user: profile });

  // Sinkronkan cookie session agar perubahan status wali kelas langsung aktif tanpa perlu relogin
  const token = createSessionToken({
    uid: profile.uid,
    email: profile.email,
    nip: profile.nip,
    name: profile.name,
    role: profile.role,
    isHomeroomTeacher: profile.isHomeroomTeacher,
    homeroomClassNames: profile.homeroomClassNames,
  });
  applySessionCookie(response, token);

  return response;
}
