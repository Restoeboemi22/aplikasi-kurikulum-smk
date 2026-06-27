"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  Settings,
  Menu,
  X,
  Users,
  Bell,
  Search,
  ChevronDown,
  GraduationCap as GraduationCapIcon,
  Clock,
  Briefcase,
  Heart,
  Book,
  ClipboardList,
  FileEdit,
  Calendar as CalendarIcon,
  Award,
  Smile,
  FileSpreadsheet,
  BookOpen as BookOpenIcon,
  FileQuestion,
  Sparkles,
  Shield,
  LogOut,
  Loader2,
  Database,
  Target,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccessMenu } from "@/lib/permissions";
import Dashboard from "./dashboard/page";
import ClassPickupPage from "./jadwal-piket-kelas/page";
import ReligiousPickupPage from "./jadwal-piket-keagamaan/page";
import AISchedulePage from "./jadwal-pelajaran-ai/page";
import TeachingJournalPage from "./jurnal-mengajar/page";
import GuidanceBookPage from "./buku-pembinaan/page";
import DailyExamPage from "./penilaian-uh/page";
import AssignmentPage from "./penilaian-tugas/page";
import MidSemesterPage from "./penilaian-sts/page";
import FinalSemesterPage from "./penilaian-sas/page";
import AttitudeGradePage from "./penilaian-sikap/page";
import ReportCardPage from "./penilaian-raport/report-card-page";
import ReportCardSASTKJPage from "./penilaian-raport-tkj-sas/page";
import ReportCardSASTKRPage from "./penilaian-raport-tkr-sas/page";
import CetakDKNPage from "./cetak-dkn/page";
import StudentsPage from "./siswa/page";
import ClassMajorPage from "./kelas-jurusan/page";
import TeachersPage from "./guru/page";
import SubjectsPage from "./mata-pelajaran/page";
import CurriculumPage from "./kurikulum/page";
import LearningToolsPage from "./kurikulum-perangkat-pembelajaran/page";
import AssessmentToolsPage from "./kurikulum-perangkat-penilaian/page";
import ManageAccountsPage from "./kelola-akun/page";
import MasterNilaiPage from "./master-nilai/page";
import TeachingObjectivesPage from "./tujuan-pembelajaran/page";
import LaporanKetidakhadiranPage from "./laporan-ketidakhadiran/page";
import schoolLogo from "../logo SMKS PACET.png";

type NavEntry = {
  id: string;
  label: string;
  icon: any;
  children?: NavEntry[];
};

type NavGroup = NavEntry & {
  children: NavEntry[];
};

function isGroup(item: NavEntry): item is NavGroup {
  return Array.isArray(item.children);
}

function filterNavEntries(
  entries: NavEntry[],
  role: "ADMIN" | "TEACHER",
  menuAccessContext: { isHomeroomTeacher: boolean }
): NavEntry[] {
  return entries
    .map((item) => {
      if (isGroup(item)) {
        const children = filterNavEntries(item.children, role, menuAccessContext);
        return { ...item, children };
      }
      return item;
    })
    .filter((item) => {
      if (isGroup(item)) return item.children.length > 0;
      return canAccessMenu(role, item.id, menuAccessContext);
    });
}

function collectLabels(entries: NavEntry[], labelById: Record<string, string>) {
  entries.forEach((item) => {
    labelById[item.id] = item.label;
    if (isGroup(item)) {
      collectLabels(item.children, labelById);
    }
  });
}

function findAncestorGroups(entries: NavEntry[], targetId: string, ancestors: string[] = []): string[] | null {
  for (const item of entries) {
    if (item.id === targetId) {
      return ancestors;
    }
    if (isGroup(item)) {
      const nested = findAncestorGroups(item.children, targetId, [...ancestors, item.id]);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function hasActiveDescendant(entries: NavEntry[], targetId: string): boolean {
  return entries.some((item) => item.id === targetId || (isGroup(item) && hasActiveDescendant(item.children, targetId)));
}


export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const role = user?.role ?? "TEACHER";
  const displayName = user?.name?.toUpperCase() ?? "GURU";
  const menuAccessContext = {
    isHomeroomTeacher: user?.isHomeroomTeacher ?? false,
  };
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Gate: belum login -> ke halaman login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
  }, [activeTab, loading, user]);

  useEffect(() => {
  }, [activeTab, role, user]);

  useEffect(() => {
    const parentGroups = findAncestorGroups(navItems, activeTab) ?? [];
    if (parentGroups.length > 0) {
      setExpandedMenus(prev => {
        const newExpanded = [...new Set([...prev, ...parentGroups])];
        return newExpanded;
      });
    }
  }, [activeTab]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...new Set([...prev, menuId])]
    );
  };

  const allNavItems: NavEntry[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "database-group",
      label: "Database",
      icon: Users,
      children: [
        { id: "siswa", label: "Data Siswa", icon: Users },
        { id: "kelas-jurusan", label: "Kelas-Jurusan", icon: GraduationCapIcon },
        { id: "guru", label: "Data Guru", icon: Users },
        { id: "mata-pelajaran", label: "Data Mata Pelajaran", icon: BookOpenIcon },
      ]
    },
    {
      id: "kurikulum-group",
      label: "Kurikulum",
      icon: BookOpen,
      children: [
        { id: "kurikulum", label: "Dokumen Kurikulum", icon: FileText },
        { id: "kurikulum-perangkat-pembelajaran", label: "Perangkat Pembelajaran", icon: BookOpenIcon },
        { id: "kurikulum-perangkat-penilaian", label: "Perangkat Penilaian", icon: FileQuestion },
      ]
    },
    {
      id: "jadwal-group",
      label: "Jadwal",
      icon: Calendar,
      children: [
        { id: "jadwal-pelajaran-ai", label: "Mengatur Jadwal Guru Otomatis by AI", icon: Sparkles },
        { id: "jadwal-piket-kelas", label: "Jadwal Piket Kelas", icon: Briefcase },
        { id: "jadwal-piket-keagamaan", label: "Jadwal Piket Keagamaan", icon: Heart },
      ]
    },
    {
      id: "jurnal-group",
      label: "Jurnal",
      icon: FileText,
      children: [
        { id: "jurnal-mengajar", label: "Jurnal Mengajar", icon: FileText },
        { id: "buku-pembinaan", label: "Buku Pembinaan", icon: Book },
        { id: "laporan-ketidakhadiran", label: "Ketidakhadiran Siswa", icon: Users },
      ]
    },
    {
      id: "penilaian-group",
      label: "Penilaian",
      icon: GraduationCap,
      children: [
        { id: "master-nilai", label: "Master Nilai", icon: Database },
        { id: "tujuan-pembelajaran", label: "TP (Tujuan Pembelajaran)", icon: Target },
        { id: "penilaian-uh", label: "AH (Asesmen Harian)", icon: ClipboardList },
        { id: "penilaian-tugas", label: "Tugas", icon: FileEdit },
        { id: "penilaian-sts", label: "STS (Sumatif Tengah Semester)", icon: CalendarIcon },
        { id: "penilaian-sas", label: "SAS (Sumatif Akhir Semester)", icon: Award },
        { id: "penilaian-sikap", label: "Nilai Sikap", icon: Smile },
      ]
    },
    {
      id: "laporan-group",
      label: "Laporan",
      icon: FileSpreadsheet,
      children: [
        {
          id: "raport-tkj-group",
          label: "Cetak Raport TKJ",
          icon: FileSpreadsheet,
          children: [
            { id: "penilaian-raport-tkj", label: "STS", icon: FileSpreadsheet },
            { id: "penilaian-raport-tkj-sas", label: "SAS", icon: FileSpreadsheet },
          ],
        },
        {
          id: "raport-tkr-group",
          label: "Cetak Raport TKR",
          icon: FileSpreadsheet,
          children: [
            { id: "penilaian-raport-tkr", label: "STS", icon: FileSpreadsheet },
            { id: "penilaian-raport-tkr-sas", label: "SAS", icon: FileSpreadsheet },
          ],
        },
        { id: "cetak-dkn", label: "Cetak DKN", icon: FileText },
      ]
    },
    { id: "kelola-akun", label: "Kelola Akun", icon: Shield },
    { id: "pengaturan", label: "Pengaturan", icon: Settings },
  ];

  // Peta id -> label untuk judul header yang rapi (alih-alih id mentah).
  const labelById: Record<string, string> = {};
  collectLabels(allNavItems, labelById);
  const activeLabel = labelById[activeTab] ?? "Dashboard";

  // Filter menu sesuai role. Untuk grup, tampilkan hanya anak yang boleh,
  // dan sembunyikan grup bila tak ada anak yang tersisa.
  const navItems = filterNavEntries(allNavItems, role, menuAccessContext);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "kurikulum":
        return <CurriculumPage />;
      case "kurikulum-perangkat-pembelajaran":
        return <LearningToolsPage />;
      case "kurikulum-perangkat-penilaian":
        return <AssessmentToolsPage />;
      case "jadwal-pelajaran-ai":
        return <AISchedulePage />;
      case "jadwal-piket-kelas":
        return <ClassPickupPage />;
      case "jadwal-piket-keagamaan":
        return <ReligiousPickupPage />;
      case "jurnal-mengajar":
        return <TeachingJournalPage />;
      case "buku-pembinaan":
        return <GuidanceBookPage />;
      case "penilaian-uh":
        return <DailyExamPage />;
      case "penilaian-tugas":
        return <AssignmentPage />;
      case "penilaian-sts":
        return <MidSemesterPage />;
      case "penilaian-sas":
        return <FinalSemesterPage />;
      case "penilaian-sikap":
        return <AttitudeGradePage />;
      case "penilaian-raport-tkj":
        return <ReportCardPage reportMajorCode="TKJ" reportLabel="Cetak Raport TKJ - STS" />;
      case "penilaian-raport-tkr":
        return <ReportCardPage reportMajorCode="TKR" reportLabel="Cetak Raport TKR - STS" />;
      case "penilaian-raport-tkj-sas":
        return <ReportCardSASTKJPage />;
      case "penilaian-raport-tkr-sas":
        return <ReportCardSASTKRPage />;
      case "laporan-ketidakhadiran":
        return <LaporanKetidakhadiranPage />;
      case "cetak-dkn":
        return <CetakDKNPage />;
      case "siswa":
        return <StudentsPage />;
      case "kelas-jurusan":
        return <ClassMajorPage />;
      case "guru":
        return <TeachersPage />;
      case "mata-pelajaran":
        return <SubjectsPage />;
      case "kelola-akun":
        return <ManageAccountsPage />;
      case "master-nilai":
        return <MasterNilaiPage />;
      case "tujuan-pembelajaran":
        return <TeachingObjectivesPage />;
      default:
        return <Dashboard />;
    }
  };

  // Penjagaan akses isi konten: meski menu sudah disembunyikan, cegah juga
  // guru membuka halaman terlarang lewat state activeTab.
  const renderGuardedContent = () => {
    if (activeTab === "dashboard" && role !== "ADMIN") {
      return (
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-3xl rounded-3xl border border-sky-200/20 bg-[linear-gradient(135deg,#0f172a_0%,#13223d_52%,#1d4ed8_120%)] px-8 py-14 text-center shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full bg-[linear-gradient(180deg,#1e293b_0%,#0f172a_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.35)] ring-4 ring-sky-100/10 md:h-44 md:w-44">
              <Image
                src={schoolLogo}
                alt="Logo SMKS Pacet"
                className="h-28 w-28 object-contain md:h-32 md:w-32"
                priority
              />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">
              Dashboard Guru
            </p>
            <h3 className="mt-4 text-3xl font-bold leading-tight text-white md:text-4xl">
              SELAMAT DATANG {displayName} DI APLIKASI PENILAIAN TERPADU SMKS PACET
            </h3>
            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-amber-300 via-sky-300 to-blue-500" />
            <p className="mx-auto mt-5 max-w-2xl text-sm text-slate-200 md:text-base">
              Gunakan menu di sebelah kiri untuk membuka jurnal, kurikulum, dan penilaian sesuai tugas mengajar Anda.
            </p>
          </div>
        </div>
      );
    }

    if (!canAccessMenu(role, activeTab, menuAccessContext)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center py-20">
          <Shield size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Akses Ditolak</h3>
          <p className="text-sm text-gray-500 mt-1">
            Anda tidak memiliki izin untuk membuka halaman ini.
          </p>
        </div>
      );
    }
    return renderContent();
  };

  // Komponen NavItem recursive untuk nested menu
  const NavItem = ({ item, parentId, ancestorIds = [] }: { item: NavEntry; parentId?: string; ancestorIds?: string[] }) => {
    const Icon = item.icon;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = activeTab === item.id;

    if (isGroup(item)) {
      const hasActiveChild = hasActiveDescendant(item.children, activeTab);

      return (
        <div key={item.id} className="space-y-1 bg-primary-900">
          <button
            onClick={() => {
              setExpandedMenus((prev) =>
                prev.includes(item.id)
                  ? prev.filter((id) => id !== item.id)
                  : [...new Set([...prev, ...ancestorIds, item.id])]
              );
            }}
            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
              isActive || hasActiveChild
                ? "border-sky-300/40 bg-gradient-to-r from-primary-700 to-blue-700 text-white shadow-[0_10px_25px_rgba(37,99,235,0.28)]"
                : "border-transparent bg-primary-900 text-primary-200 hover:border-primary-700 hover:bg-primary-800"
            }`}
          >
            <div className="flex items-center">
              <Icon size={20} />
              {sidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
            </div>
            {sidebarOpen && (
              <ChevronDown
                size={16}
                className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            )}
          </button>
          {isExpanded && sidebarOpen && (
            <div className="ml-4 space-y-1 bg-primary-900">
              {item.children.map((child) => (
                <NavItem key={child.id} item={child} parentId={item.id} ancestorIds={[...ancestorIds, item.id]} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          if (parentId) {
            setExpandedMenus([parentId]);
          } else {
            setExpandedMenus([]);
          }
        }}
        className={`w-full flex items-center rounded-xl border px-4 py-2.5 text-sm transition-all ${
          activeTab === item.id
            ? "border-sky-300/40 bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)]"
            : "border-transparent bg-primary-900 text-primary-300 hover:border-primary-700 hover:bg-primary-800"
        }`}
      >
        <Icon size={18} className={activeTab === item.id ? "text-sky-100" : ""} />
        <span className="ml-3 font-medium">{item.label}</span>
      </button>
    );
  };

  // Selagi memeriksa sesi, atau saat belum login (menunggu redirect),
  // tampilkan layar loading agar isi aplikasi tidak sempat berkedip.
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-primary-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between" suppressHydrationWarning>
          <div className={`${!sidebarOpen && "hidden"}`}>
            <h1 className="text-xl font-bold">Kurikulum SMK</h1>
            <p className="text-xs text-primary-300">Sistem Manajemen</p>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {isClient && (sidebarOpen ? <X size={20} /> : <Menu size={20} />)}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 bg-primary-900">
          {navItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>

        <div className="p-4 border-t border-primary-800 bg-primary-900" suppressHydrationWarning>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center">
              {user.role === "ADMIN" ? <Shield size={20} /> : <Users size={20} />}
            </div>
            {isClient && sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-primary-300">
                  {user.role === "ADMIN" ? "Admin" : "Guru"}
                </p>
              </div>
            )}
            {isClient && sidebarOpen && (
              <button
                onClick={logout}
                title="Keluar"
                className="p-2 rounded-lg hover:bg-primary-800 text-primary-200"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-pink-100 via-rose-100 to-fuchsia-100 border-b border-pink-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-pink-700">
              {activeLabel}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
              <input
                type="text"
                placeholder="Cari..."
                className="pl-10 pr-4 py-2 rounded-full border border-pink-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <button className="p-2 rounded-full hover:bg-pink-200/60 text-pink-500">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="kitty-bg flex-1 overflow-auto p-6">{renderGuardedContent()}</div>
      </main>
    </div>
  );
}
