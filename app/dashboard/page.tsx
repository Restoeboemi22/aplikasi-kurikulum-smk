"use client";

import { useState } from "react";
import { BookOpen, FileText, Users, Calendar, CheckCircle, Clock, AlertCircle, RefreshCcw } from "lucide-react";

export default function Dashboard() {
  const [isResetting, setIsResetting] = useState(false);
  
  const stats = [
    { label: "Dokumen Kurikulum", value: "24", icon: BookOpen, color: "bg-blue-500" },
    { label: "Jurnal Hari Ini", value: "18", icon: FileText, color: "bg-green-500" },
    { label: "Guru Aktif", value: "32", icon: Users, color: "bg-purple-500" },
    { label: "Jadwal Minggu Ini", value: "128", icon: Calendar, color: "bg-orange-500" },
  ];
  
  const handleResetData = () => {
    if (confirm("Anda yakin ingin mereset semua data ke default? Semua perubahan akan hilang!")) {
      setIsResetting(true);
      // Clear all localStorage items
      localStorage.clear();
      // Reload to apply defaults
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const recentActivities = [
    { time: "08:30", teacher: "Pak Budi", action: "Mengisi jurnal mengajar", subject: "Matematika", status: "success" },
    { time: "09:15", teacher: "Bu Siti", action: "Upload RPP", subject: "Bahasa Indonesia", status: "pending" },
    { time: "10:00", teacher: "Pak Anton", action: "Mengisi nilai harian", subject: "IPA", status: "success" },
    { time: "11:30", teacher: "Bu Rina", action: "Mengisi jurnal mengajar", subject: "IPS", status: "warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Dashboard</h3>
          <p className="text-sm text-gray-500">Ringkasan sistem kurikulum</p>
        </div>
        <button
          onClick={handleResetData}
          disabled={isResetting}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          <RefreshCcw size={18} className={isResetting ? "animate-spin" : ""} />
          {isResetting ? "Mereset..." : "Reset Semua Data"}
        </button>
      </div>
      
      {/* Stats Cards */}
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
        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Aktivitas Terbaru</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50">
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

        {/* Google Workspace Integration */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Integrasi Google Workspace</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Google Sheets Terhubung</p>
                <p className="text-sm text-green-600">Sinkronisasi otomatis aktif</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-800">Google Drive Terhubung</p>
                <p className="text-sm text-blue-600">Dokumen disimpan otomatis</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-purple-800">Google Calendar Terhubung</p>
                <p className="text-sm text-purple-600">Kalender akademik sinkron</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
