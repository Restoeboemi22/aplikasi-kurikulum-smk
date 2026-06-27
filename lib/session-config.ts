export const SESSION_COOKIE_NAME = "kurikulum_session";

export function getSessionSecret() {
  return (
    process.env.APP_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "local-dev-session-secret"
  );
}
