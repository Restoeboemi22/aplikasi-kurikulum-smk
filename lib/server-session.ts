import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createSessionToken,
  getSessionMaxAgeSeconds,
  SESSION_COOKIE_NAME,
  SessionProfile,
  SessionRole,
  ServerSessionUser,
  verifySessionToken,
} from "@/lib/session-token";

export {
  createSessionToken,
  SESSION_COOKIE_NAME,
  type SessionProfile,
  type SessionRole,
  type ServerSessionUser,
  verifySessionToken,
} from "@/lib/session-token";

export async function fetchServerSessionUserFromFirebase(idToken: string): Promise<{
  uid: string;
  email: string;
  nip: string;
  name: string;
  role: SessionRole;
}> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("Konfigurasi Firebase server belum lengkap.");
  }

  const authResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );

  const authData = await authResponse.json().catch(() => null);
  const authUser = authData?.users?.[0];

  if (!authResponse.ok || !authUser?.localId || !authUser?.email) {
    throw new Error("Token login Firebase tidak valid.");
  }

  const profileName = authUser.displayName || authUser.email.split("@")[0];
  const profileNip = authUser.email.split("@")[0];
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });
  const bootstrapRole = adminCount === 0 ? "ADMIN" : "TEACHER";

  let appUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: authUser.email }, { nip: profileNip || undefined }],
    },
  });

  if (!appUser) {
    if (adminCount === 0) {
      appUser = await prisma.user.create({
        data: {
          name: profileName,
          email: authUser.email,
          nip: profileNip || null,
          role: bootstrapRole,
        },
      });
    } else {
      throw new Error("ACCOUNT_NOT_LINKED");
    }
  } else if (
    appUser.name !== profileName ||
    appUser.email !== authUser.email ||
    (profileNip && appUser.nip !== profileNip) ||
    (adminCount === 0 && appUser.role !== "ADMIN")
  ) {
    appUser = await prisma.user.update({
      where: { id: appUser.id },
      data: {
        name: appUser.name || profileName,
        email: appUser.email || authUser.email,
        nip: appUser.nip || profileNip || null,
        role: adminCount === 0 ? "ADMIN" : appUser.role,
      },
    });
  }

  return {
    uid: appUser.id,
    email: appUser.email,
    nip: appUser.nip || profileNip,
    name: appUser.name,
    role: appUser.role === "ADMIN" ? "ADMIN" : "TEACHER",
  };
}

export async function buildSessionProfile(session: ServerSessionUser): Promise<SessionProfile> {
  if (session.role !== "TEACHER") {
    return {
      ...session,
      isHomeroomTeacher: false,
      homeroomClassNames: [],
    };
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.uid },
    select: {
      id: true,
      homeroomClasses: {
        select: {
          className: true,
        },
        orderBy: {
          className: "asc",
        },
      },
    },
  });

  const homeroomClassNames = teacher?.homeroomClasses.map((item) => item.className) ?? [];

  return {
    ...session,
    isHomeroomTeacher: homeroomClassNames.length > 0,
    homeroomClassNames,
  };
}

export function applySessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getServerSession(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function requireSession(request: NextRequest): ServerSessionUser {
  const session = getServerSession(request);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function requireRole(request: NextRequest, allowedRoles: SessionRole[]) {
  const session = requireSession(request);
  if (!allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
