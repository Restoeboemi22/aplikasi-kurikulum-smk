"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCcw,
  Users,
} from "lucide-react";

type SummaryResponse = {
  stats: {
    curriculumCount: number;
    journalsToday: number;
    teacherCount: number;
    schedulesThisSemester: number;
  };
  period: {
    term: string;
    academicYear: string;
  };
  activities: Array<{
    id: string;
    time: string;
    teacher: string;
    action: string;
    subject: string;
    status: "success" | "pending" | "warning";
  }>;
  integrations: Array<{
    name: string;
    description: string;
    status: "success" | "pending" | "warning";
  }>;
};

const EMPTY_SUMMARY: SummaryResponse = {
  stats: {
    curriculumCount: 0,
    journalsToday: 0,
    teacherCount: 0,
    schedulesThisSemester: 0,
  },
  period: {
    term: "Ganjil",
    academicYear: "-",
  },
  activities: [],
  integrations: [],
};

function IntegrationIcon({ status }: { status: "success" | "pending" | "warning" }) {
  if (status === "success") {
    return <CheckCircle size={20} className="text-green-600" />;
  }
  if (status === "pending") {
    return <Clock size={20} className="text-yellow-600" />;
  }
  return <AlertCircle size={20} className="text-orange-600" />;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryResponse>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = async (showFullLoading = false) => {
    if (showFullLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Gagal memuat ringkasan dashboard.");
      }

      setSummary(result);
    } catch (error: any) {
      setError(error.message || "Gagal memuat ringkasan dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary(true);
  }, []);

  const stats = [
    {
      label: "Dokumen Kurikulum",
      value: summary.stats.curriculumCount,
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      label: "Jurnal Hari Ini",
      value: summary.stats.journalsToday,
      icon: FileText,
      color: "bg-green-500",
    },
    {
      label: "Guru Aktif",
      value: summary.stats.teacherCount,
      icon: Users,
      color: "bg-purple-500",
    },
    {
      label: "Jadwal Semester Ini",
      value: summary.stats.schedulesThisSemester,
      icon: Calendar,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Dashboard</h3>
          <p className="text-sm text-gray-500">
            Ringkasan sistem kurikulum untuk {summary.period.term} {summary.period.academicYear}
          </p>
        </div>
        <button
          onClick={() => loadSummary(false)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
        >
          <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Memuat..." : "Muat Ulang"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white px-6 py-12 text-center text-gray-500">
          <span className="inline-flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Memuat ringkasan dashboard...
          </span>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h3>
          <div className="space-y-4">
            {summary.activities.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                Belum ada aktivitas terbaru untuk ditampilkan.
              </div>
            )}
            {summary.activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50">
                <div className="mt-1">
                  {activity.status === "success" ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : activity.status === "pending" ? (
                    <Clock size={20} className="text-yellow-500" />
                  ) : (
                    <AlertCircle size={20} className="text-orange-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {activity.teacher} - {activity.action}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.subject} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Integrasi Sistem</h3>
          <div className="space-y-4">
            {summary.integrations.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                Belum ada status integrasi.
              </div>
            )}
            {summary.integrations.map((integration) => {
              const colorClass =
                integration.status === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : integration.status === "pending"
                  ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                  : "bg-orange-50 border-orange-200 text-orange-800";

              return (
                <div
                  key={integration.name}
                  className={`flex items-center gap-4 rounded-lg border p-4 ${colorClass}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70">
                    <IntegrationIcon status={integration.status} />
                  </div>
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-sm opacity-90">{integration.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
