// Satu sumber kebenaran untuk hak akses berbasis role.
// Dipakai oleh sidebar (menyembunyikan menu) dan halaman (membatasi tab).

export type Role = "ADMIN" | "TEACHER";
export type MenuAccessContext = {
  isHomeroomTeacher?: boolean;
};
export type PathAccessContext = MenuAccessContext & {
  role: Role;
};

// Menu/submenu yang boleh diakses GURU. Admin selalu boleh semua.
// ID di sini harus cocok dengan id pada navItems di app/page.tsx.
export const TEACHER_ALLOWED_MENU_IDS: string[] = [
  "kurikulum-perangkat-pembelajaran",
  "kurikulum-perangkat-penilaian",
  "jadwal-piket-kelas",
  "jadwal-piket-keagamaan",
  "jurnal-mengajar",
  "tujuan-pembelajaran",
  // Penilaian (semua submenu) — guru ikut mengakses, format dibahas terpisah.
  "penilaian-uh",
  "penilaian-tugas",
  "penilaian-sts",
  "penilaian-sas",
  "penilaian-sikap",
];

// Tab yang boleh diakses GURU di dalam halaman tertentu.
// Key = id halaman, value = daftar id tab yang boleh.
export const TEACHER_ALLOWED_TABS: Record<string, string[]> = {
  "kurikulum-perangkat-pembelajaran": ["submit"],
  "kurikulum-perangkat-penilaian": ["submit"],
  "jurnal-mengajar": ["format"],
};

const PATH_TO_MENU_ID: Record<string, string> = {
  "/dashboard": "dashboard",
  "/siswa": "siswa",
  "/kelas-jurusan": "kelas-jurusan",
  "/guru": "guru",
  "/mata-pelajaran": "mata-pelajaran",
  "/kurikulum": "kurikulum",
  "/kurikulum-perangkat-pembelajaran": "kurikulum-perangkat-pembelajaran",
  "/kurikulum-perangkat-penilaian": "kurikulum-perangkat-penilaian",
  "/jadwal-pelajaran-ai": "jadwal-pelajaran-ai",
  "/jadwal-piket-kelas": "jadwal-piket-kelas",
  "/jadwal-piket-keagamaan": "jadwal-piket-keagamaan",
  "/jurnal-mengajar": "jurnal-mengajar",
  "/buku-pembinaan": "buku-pembinaan",
  "/master-nilai": "master-nilai",
  "/tujuan-pembelajaran": "tujuan-pembelajaran",
  "/penilaian-uh": "penilaian-uh",
  "/penilaian-tugas": "penilaian-tugas",
  "/penilaian-sts": "penilaian-sts",
  "/penilaian-sas": "penilaian-sas",
  "/penilaian-sikap": "penilaian-sikap",
  "/penilaian-raport": "penilaian-raport",
  "/penilaian-raport-tkj": "penilaian-raport-tkj",
  "/penilaian-raport-tkr": "penilaian-raport-tkr",
  "/penilaian-raport-tkj-sas": "penilaian-raport-tkj-sas",
  "/penilaian-raport-tkr-sas": "penilaian-raport-tkr-sas",
  "/cetak-dkn": "cetak-dkn",
  "/kelola-akun": "kelola-akun",
};

const ADMIN_ONLY_PATHS = new Set([
  "/jadwal",
  "/jadwal-pelajaran",
  "/jurnal",
  "/nilai",
]);

export const PUBLIC_PATHS = new Set(["/login"]);

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function canAccessMenu(role: Role, menuId: string, context: MenuAccessContext = {}): boolean {
  if (role === "ADMIN") return true;
  if (
    menuId === "penilaian-raport" ||
    menuId === "penilaian-raport-tkj" ||
    menuId === "penilaian-raport-tkr" ||
    menuId === "penilaian-raport-tkj-sas" ||
    menuId === "penilaian-raport-tkr-sas"
  ) {
    return Boolean(context.isHomeroomTeacher);
  }
  return TEACHER_ALLOWED_MENU_IDS.includes(menuId);
}

export function canAccessTab(role: Role, pageId: string, tabId: string): boolean {
  if (role === "ADMIN") return true;
  const allowed = TEACHER_ALLOWED_TABS[pageId];
  // Halaman tanpa aturan khusus: guru tidak dibatasi per-tab di sini
  // (akses ke halaman itu sendiri sudah dijaga oleh canAccessMenu).
  if (!allowed) return true;
  return allowed.includes(tabId);
}

// Tab default yang aman untuk role tertentu pada sebuah halaman.
export function defaultTabFor(role: Role, pageId: string, adminDefault: string): string {
  if (role === "ADMIN") return adminDefault;
  const allowed = TEACHER_ALLOWED_TABS[pageId];
  if (!allowed || allowed.includes(adminDefault)) return adminDefault;
  return allowed[0] ?? adminDefault;
}

export function canAccessPath(pathname: string, context: PathAccessContext): boolean {
  const normalizedPath = normalizePathname(pathname);

  if (PUBLIC_PATHS.has(normalizedPath) || normalizedPath === "/") {
    return true;
  }

  const menuId = PATH_TO_MENU_ID[normalizedPath];
  if (menuId) {
    return canAccessMenu(context.role, menuId, context);
  }

  if (ADMIN_ONLY_PATHS.has(normalizedPath)) {
    return context.role === "ADMIN";
  }

  return true;
}
