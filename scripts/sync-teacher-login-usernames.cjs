const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const LOGIN_DOMAIN = "kurikulum-smks-pacet.local";
const DEFAULT_TEACHER_PASSWORD = "guru123";

function birthDateToLoginUsername(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  if (/^\d{8}$/.test(rawValue)) {
    return rawValue;
  }

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    const serial = Number(rawValue);
    if (Number.isFinite(serial) && serial >= 20000 && serial <= 60000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const parsedDate = new Date(excelEpoch + Math.round(serial) * 24 * 60 * 60 * 1000);
      const day = String(parsedDate.getUTCDate()).padStart(2, "0");
      const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
      const year = String(parsedDate.getUTCFullYear());
      return `${day}${month}${year}`;
    }
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}${isoMatch[2]}${isoMatch[1]}`;
  }

  const localMatch = rawValue.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (localMatch) {
    const day = localMatch[1].padStart(2, "0");
    const month = localMatch[2].padStart(2, "0");
    return `${day}${month}${localMatch[3]}`;
  }

  return rawValue.replace(/\D/g, "");
}

function loginUsernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${LOGIN_DOMAIN}`;
}

async function ensureFirebaseLogin(email) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    return { status: "skipped", reason: "Konfigurasi Firebase belum lengkap." };
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: DEFAULT_TEACHER_PASSWORD,
        returnSecureToken: false,
      }),
    }
  );

  const result = await response.json().catch(() => null);
  if (response.ok) {
    return { status: "created" };
  }

  if (result?.error?.message === "EMAIL_EXISTS") {
    return { status: "exists" };
  }

  return {
    status: "failed",
    reason: result?.error?.message || "Gagal membuat akun Firebase.",
  };
}

async function main() {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
    },
    orderBy: {
      kodeGuru: "asc",
    },
  });

  const usernameCounts = new Map();
  for (const teacher of teachers) {
    const username = birthDateToLoginUsername(teacher.tanggalLahir);
    if (!username) continue;
    usernameCounts.set(username, (usernameCounts.get(username) || 0) + 1);
  }

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      teacher: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          grades: true,
          journals: true,
        },
      },
    },
  });
  const emailOwners = new Map(
    allUsers.map((user) => [String(user.email || "").toLowerCase(), user])
  );

  const summary = {
    updated: 0,
    unchanged: 0,
    skippedMissingBirthDate: 0,
    skippedDuplicateUsername: 0,
    skippedConflictEmail: 0,
    firebaseCreated: 0,
    firebaseExists: 0,
    firebaseFailed: 0,
  };

  for (const teacher of teachers) {
    const username = birthDateToLoginUsername(teacher.tanggalLahir);
    if (!username) {
      summary.skippedMissingBirthDate += 1;
      console.log(`[SKIP] ${teacher.kodeGuru} - tanggal lahir kosong/tidak valid.`);
      continue;
    }

    if ((usernameCounts.get(username) || 0) > 1) {
      summary.skippedDuplicateUsername += 1;
      console.log(`[SKIP] ${teacher.kodeGuru} - username ${username} bentrok dengan guru lain.`);
      continue;
    }

    const targetEmail = loginUsernameToEmail(username);
    const emailOwner = emailOwners.get(targetEmail.toLowerCase());
    if (emailOwner && emailOwner.id !== teacher.userId) {
      const canRemoveDetachedOwner =
        emailOwner.role !== "ADMIN" &&
        !emailOwner.teacher &&
        emailOwner._count.grades === 0 &&
        emailOwner._count.journals === 0;

      if (canRemoveDetachedOwner) {
        await prisma.user.delete({
          where: { id: emailOwner.id },
        });
        emailOwners.delete(targetEmail.toLowerCase());
        console.log(`[CLEANUP] Menghapus akun lepas ${targetEmail} agar bisa dipakai guru ${teacher.kodeGuru}.`);
      } else {
        summary.skippedConflictEmail += 1;
        console.log(`[SKIP] ${teacher.kodeGuru} - email ${targetEmail} sudah dipakai user lain.`);
        continue;
      }
    }

    if ((teacher.user.email || "").toLowerCase() !== targetEmail.toLowerCase()) {
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { email: targetEmail },
      });
      emailOwners.delete(String(teacher.user.email || "").toLowerCase());
      emailOwners.set(targetEmail.toLowerCase(), {
        id: teacher.userId,
        email: targetEmail,
        role: teacher.user.role,
        teacher: { id: teacher.id },
        _count: { grades: 0, journals: 0 },
      });
      summary.updated += 1;
      console.log(`[UPDATE] ${teacher.kodeGuru} -> ${username}`);
    } else {
      summary.unchanged += 1;
      console.log(`[OK] ${teacher.kodeGuru} -> ${username}`);
    }

    const firebaseResult = await ensureFirebaseLogin(targetEmail);
    if (firebaseResult.status === "created") {
      summary.firebaseCreated += 1;
    } else if (firebaseResult.status === "exists") {
      summary.firebaseExists += 1;
    } else {
      summary.firebaseFailed += 1;
      console.log(`[FIREBASE-FAIL] ${teacher.kodeGuru} - ${firebaseResult.reason}`);
    }
  }

  console.log("\nRingkasan:");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Password default akun guru: ${DEFAULT_TEACHER_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
