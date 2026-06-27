import { NextRequest, NextResponse } from "next/server";
import { canAccessPath, PUBLIC_PATHS } from "@/lib/permissions";
import { getSessionSecret, SESSION_COOKIE_NAME } from "@/lib/session-config";

type MiddlewareSession = {
  role: "ADMIN" | "TEACHER";
  isHomeroomTeacher?: boolean;
  exp: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signSessionPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBase64Url(new Uint8Array(signature));
}

async function verifyMiddlewareSession(token?: string | null): Promise<MiddlewareSession | null> {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signSessionPayload(encodedPayload);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as MiddlewareSession;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function buildLoginUrl(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (currentPath && currentPath !== "/login") {
    loginUrl.searchParams.set("next", currentPath);
  }
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const session = await verifyMiddlewareSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (PUBLIC_PATHS.has(normalizedPath)) {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(buildLoginUrl(request));
  }

  const hasAccess = canAccessPath(normalizedPath, {
    role: session.role,
    isHomeroomTeacher: Boolean(session.isHomeroomTeacher),
  });

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|css|js|map)$).*)",
  ],
};
