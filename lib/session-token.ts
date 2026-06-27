import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret, SESSION_COOKIE_NAME } from "@/lib/session-config";
export { SESSION_COOKIE_NAME } from "@/lib/session-config";

export type SessionRole = "ADMIN" | "TEACHER";

export interface ServerSessionUser {
  uid: string;
  email: string;
  nip: string;
  name: string;
  role: SessionRole;
  isHomeroomTeacher?: boolean;
  homeroomClassNames?: string[];
  iat: number;
  exp: number;
}

export interface SessionProfile extends ServerSessionUser {
  isHomeroomTeacher: boolean;
  homeroomClassNames: string[];
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(payload: Omit<ServerSessionUser, "iat" | "exp">) {
  const now = Math.floor(Date.now() / 1000);
  const sessionPayload: ServerSessionUser = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(sessionPayload));
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token?: string | null): ServerSessionUser | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signValue(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as ServerSessionUser;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}
