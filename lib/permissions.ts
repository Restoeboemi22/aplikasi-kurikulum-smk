// Satu sumber kebenaran untuk hak akses berbasis role.
// Dipakai oleh sidebar (menyembunyikan menu) dan halaman (membatasi tab).

export type Role = "ADMIN" | "TEACHER";

// Menu/submenu yang boleh diakses GURU. Admin selalu boleh semua.
// ID di sini harus cocok dengan id pada navItems di app/page.tsx.
export const TEACHER_ALLOWED_MENU_IDS: string[] = [
  "kurikulum-perangkat-pembelajaran",
  "kurikulum-perangkat-penilaian",
  "jurnal-mengajar",
];

// Tab yang boleh diakses GURU di dalam halaman tertentu.
// Key = id halaman, value = daftar id tab yang boleh.
export const TEACHER_ALLOWED_TABS: Record<string, string[]> = {
  "kurikulum-perangkat-pembelajaran": ["submit"],
  "kurikulum-perangkat-penilaian": ["submit"],
  "jurnal-mengajar": ["format"],
};

export function canAccessMenu(role: Role, menuId: string): boolean {
  if (role === "ADMIN") return true;
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
