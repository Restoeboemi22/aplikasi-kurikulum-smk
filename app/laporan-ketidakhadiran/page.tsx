"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, FileText, Printer, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getDefaultGradePeriod, SEMESTER_OPTIONS, getAcademicYearOptions } from "@/lib/grade-period";

type Journal = {
  id: string;
  teacher: string;
  subject: string;
  class: string;
  semester: string;
  academicYear: string;
  date: string;
  jamKe: string;
  issues: string;
};

type AbsentStudent = {
  id: string;
  date: string;
  className: string;
  subject: string;
  teacher: string;
  jamKe: string;
  studentName: string;
  status: string;
};

const defaultPeriod = getDefaultGradePeriod();
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatDate(value: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function LaporanKetidakhadiranPage() {
  const { user } = useAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [absentList, setAbsentList] = useState<AbsentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const availableYears = [2026, 2027, 2028, 2029, 2030];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          semester: defaultPeriod.term,
          academicYear: defaultPeriod.academicYear,
        });
        const response = await fetch(`/api/journals?${params.toString()}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || "Gagal memuat data jurnal.");
        }
        setJournals(result);
        
        // Parse absent students from issues
        const absents: AbsentStudent[] = [];
        result.forEach((j: Journal) => {
          if (!j.issues) return;
          const match = j.issues.match(/Siswa Tidak Hadir:\s*([^\n]+)/);
          if (match) {
            const studentsStr = match[1];
            const studentParts = studentsStr.split(",").map(s => s.trim());
            studentParts.forEach((part, index) => {
              const statusMatch = part.match(/(.+?)\s*\((.+?)\)/);
              if (statusMatch) {
                absents.push({
                  id: `${j.id}-${index}`,
                  date: j.date,
                  className: j.class,
                  subject: j.subject,
                  teacher: j.teacher,
                  jamKe: j.jamKe,
                  studentName: statusMatch[1].trim(),
                  status: statusMatch[2].trim(),
                });
              } else {
                // Fallback if format is weird
                absents.push({
                  id: `${j.id}-${index}`,
                  date: j.date,
                  className: j.class,
                  subject: j.subject,
                  teacher: j.teacher,
                  jamKe: j.jamKe,
                  studentName: part,
                  status: "Tidak Hadir",
                });
              }
            });
          }
        });
        
        // Sort by date descending
        absents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAbsentList(absents);
        
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat laporan.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const availableClasses = Array.from(new Set(absentList.map(a => a.className))).sort();

  const filteredAbsents = absentList.filter(item => {
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) {
      if (filterMonth !== "" && d.getMonth() !== Number(filterMonth)) return false;
      if (filterYear !== "" && d.getFullYear() !== Number(filterYear)) return false;
    }
    if (filterClass && item.className !== filterClass) return false;
    if (filterStatus && item.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
    return true;
  });

  if (user?.role !== "ADMIN") {
    return (
      <div className="p-6 text-center text-gray-500">
        Hanya admin yang dapat melihat halaman ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Laporan Ketidakhadiran Siswa</h3>
          <p className="text-sm text-gray-500">Rekap siswa yang tidak hadir berdasarkan Jurnal Mengajar Guru</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
          <Printer size={18} />
          Cetak Laporan
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Bulan</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Bulan</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Tahun</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Kelas</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Keterangan</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Semua</option>
              <option value="alpa">Alpa</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
            </select>
          </div>

          {(filterMonth || filterYear || filterClass || filterStatus) && (
            <button
              onClick={() => {
                setFilterMonth("");
                setFilterYear("");
                setFilterClass("");
                setFilterStatus("");
              }}
              className="self-end px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset Filter
            </button>
          )}
          
          <div className="ml-auto self-end text-sm text-gray-500">
            Menampilkan <span className="font-semibold text-gray-800">{filteredAbsents.length}</span> data
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Nama Siswa</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Keterangan</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jam Ke-</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Memuat data...
                  </span>
                </td>
              </tr>
            )}
            {!loading && filteredAbsents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">
                  Tidak ada data ketidakhadiran siswa.
                </td>
              </tr>
            )}
            {!loading && filteredAbsents.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatDate(item.date)}</td>
                <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{item.className}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{item.studentName}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status.toLowerCase() === 'alpa' ? 'bg-red-100 text-red-800' :
                    item.status.toLowerCase() === 'sakit' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{item.teacher}</td>
                <td className="px-6 py-4 text-gray-600">{item.subject}</td>
                <td className="px-6 py-4 text-gray-600">
                  {item.jamKe ? item.jamKe.split(",").map(j => j.trim()).filter(Boolean).map(j => (
                    <span key={j} className="inline-flex items-center px-2 py-1 mr-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Ke-{j}
                    </span>
                  )) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
