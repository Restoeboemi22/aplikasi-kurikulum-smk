import { NextRequest, NextResponse } from "next/server";
import {
  applySessionCookie,
  buildSessionProfile,
  clearSessionCookie,
  createSessionToken,
  fetchServerSessionUserFromFirebase,
} from "@/lib/server-session";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "ID token wajib dikirim." }, { status: 400 });
    }

    const sessionUser = await fetchServerSessionUserFromFirebase(idToken);
    const profile = await buildSessionProfile({
      ...sessionUser,
      iat: 0,
      exp: 0,
    });
    const token = createSessionToken({
      uid: profile.uid,
      email: profile.email,
      nip: profile.nip,
      name: profile.name,
      role: profile.role,
      isHomeroomTeacher: profile.isHomeroomTeacher,
      homeroomClassNames: profile.homeroomClassNames,
    });
    const response = NextResponse.json({
      user: {
        uid: profile.uid,
        email: profile.email,
        nip: profile.nip,
        name: profile.name,
        role: profile.role,
        isHomeroomTeacher: profile.isHomeroomTeacher,
        homeroomClassNames: profile.homeroomClassNames,
      },
    });

    applySessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Error creating session:", error);
    if (error instanceof Error && error.message === "ACCOUNT_NOT_LINKED") {
      return NextResponse.json(
        { error: "Akun login belum terhubung ke data aplikasi. Hubungi admin untuk sinkronisasi akun guru." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Gagal membuat session server." },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
