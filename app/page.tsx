"use client";

import { useState, useEffect } from "react";
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
import ReportCardPage from "./penilaian-raport/page";
import StudentsPage from "./siswa/page";
import ClassMajorPage from "./kelas-jurusan/page";
import TeachersPage from "./guru/page";
import SubjectsPage from "./mata-pelajaran/page";
import LearningToolsPage from "./kurikulum-perangkat-pembelajaran/page";
import AssessmentToolsPage from "./kurikulum-perangkat-penilaian/page";
import ManageAccountsPage from "./kelola-akun/page";

type NavLeaf = { id: string; label: string; icon: any };
type NavGroup = { id: string; label: string; icon: any; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

function isGroup(item: NavEntry): item is NavGroup {
  return "children" in item;
}


export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
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
    // Auto expand parent group when child is active
    const parentGroups = navItems.filter(item =>
      isGroup(item) && item.children.some((child: any) => child.id === activeTab)
    ).map(item => item.id);
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
        ? [] // Close all when clicking an already open group
        : [menuId] // Only open the clicked group, close others
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
      ]
    },
    {
      id: "penilaian-group",
      label: "Penilaian",
      icon: GraduationCap,
      children: [
        { id: "penilaian-uh", label: "UH (Ulangan Harian)", icon: ClipboardList },
        { id: "penilaian-tugas", label: "Tugas", icon: FileEdit },
        { id: "penilaian-sts", label: "STS (Sumatif Tengah Semester)", icon: CalendarIcon },
        { id: "penilaian-sas", label: "SAS (Sumatif Akhir Semester)", icon: Award },
        { id: "penilaian-sikap", label: "Nilai Sikap", icon: Smile },
        { id: "penilaian-raport", label: "Nilai Raport", icon: FileSpreadsheet },
      ]
    },
    { id: "kelola-akun", label: "Kelola Akun", icon: Shield },
    { id: "pengaturan", label: "Pengaturan", icon: Settings },
  ];

  const role = user?.role ?? "TEACHER";

  // Peta id -> label untuk judul header yang rapi (alih-alih id mentah).
  const labelById: Record<string, string> = {};
  allNavItems.forEach((item) => {
    labelById[item.id] = item.label;
    if (isGroup(item)) {
      item.children.forEach((c) => {
        labelById[c.id] = c.label;
      });
    }
  });
  const activeLabel = labelById[activeTab] ?? "Dashboard";

  // Filter menu sesuai role. Untuk grup, tampilkan hanya anak yang boleh,
  // dan sembunyikan grup bila tak ada anak yang tersisa.
  const navItems = allNavItems
    .map((item) => {
      if (isGroup(item)) {
        const children = item.children.filter((c) => canAccessMenu(role, c.id));
        return { ...item, children };
      }
      return item;
    })
    .filter((item) => {
      if (isGroup(item)) return item.children.length > 0;
      return canAccessMenu(role, item.id);
    });

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
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
      case "penilaian-raport":
        return <ReportCardPage />;
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
      default:
        return <Dashboard />;
    }
  };

  // Penjagaan akses isi konten: meski menu sudah disembunyikan, cegah juga
  // guru membuka halaman terlarang lewat state activeTab.
  const renderGuardedContent = () => {
    if (!canAccessMenu(role, activeTab)) {
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
  const NavItem = ({ item, parentId }: { item: any; parentId?: string }) => {
    const Icon = item.icon;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = activeTab === item.id;

    if ("children" in item) {
      return (
        <div key={item.id} className="space-y-1 bg-primary-900">
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all bg-primary-900 ${
              isActive ? "bg-primary-700 text-white" : "text-primary-200 hover:bg-primary-800"
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
              {item.children.map((child: any) => (
                <NavItem key={child.id} item={child} parentId={item.id} />
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
        className={`w-full flex items-center px-4 py-2 rounded-lg transition-all text-sm bg-primary-900 ${
          activeTab === item.id ? "bg-primary-700 text-white" : "text-primary-300 hover:bg-primary-800"
        }`}
      >
        <Icon size={18} />
        <span className="ml-3">{item.label}</span>
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
            <span className="text-2xl" aria-hidden>🎀</span>
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
