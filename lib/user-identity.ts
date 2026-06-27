export const NIP_EMAIL_DOMAIN = "kurikulum-smks-pacet.local";

export function loginUsernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${NIP_EMAIL_DOMAIN}`;
}

export function nipToEmail(nip: string): string {
  return loginUsernameToEmail(nip);
}

export function birthDateToLoginUsername(value?: string | null): string {
  const rawValue = value?.trim();
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

export function buildTeacherLoginUsername({
  birthDate,
  nip,
  kodeGuru,
}: {
  birthDate?: string | null;
  nip?: string | null;
  kodeGuru: string;
}) {
  const birthDateUsername = birthDateToLoginUsername(birthDate);
  if (birthDateUsername) {
    return birthDateUsername;
  }

  if (nip?.trim()) {
    return nip.trim();
  }

  return kodeGuru.trim();
}

export function buildTeacherIdentityEmail({
  birthDate,
  nip,
  email,
  kodeGuru,
}: {
  birthDate?: string | null;
  nip?: string | null;
  email?: string | null;
  kodeGuru: string;
}) {
  if (email?.trim()) {
    return email.trim().toLowerCase();
  }

  return loginUsernameToEmail(
    buildTeacherLoginUsername({
      birthDate,
      nip,
      kodeGuru,
    })
  );
}
