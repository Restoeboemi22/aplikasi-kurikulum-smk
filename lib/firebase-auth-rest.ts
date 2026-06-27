export type FirebaseProvisionResult =
  | {
      status: "created";
      email: string;
      initialPassword: string;
      loginHint: string;
    }
  | {
      status: "exists";
      email: string;
      loginHint: string;
    }
  | {
      status: "skipped";
      email: string;
      reason: string;
      loginHint: string;
    };

export const DEFAULT_TEACHER_PASSWORD = "guru123";

export async function provisionFirebasePasswordUser({
  email,
  loginHint,
}: {
  email: string;
  loginHint: string;
}): Promise<FirebaseProvisionResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    return {
      status: "skipped",
      email,
      reason: "Konfigurasi Firebase server belum lengkap.",
      loginHint,
    };
  }

  const initialPassword = DEFAULT_TEACHER_PASSWORD;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: initialPassword,
        returnSecureToken: false,
      }),
      cache: "no-store",
    }
  );

  const result = await response.json().catch(() => null);

  if (response.ok) {
    return {
      status: "created",
      email,
      initialPassword,
      loginHint,
    };
  }

  const errorCode = result?.error?.message;

  if (errorCode === "EMAIL_EXISTS") {
    return {
      status: "exists",
      email,
      loginHint,
    };
  }

  return {
    status: "skipped",
    email,
    reason: errorCode || "Gagal membuat akun login Firebase.",
    loginHint,
  };
}
