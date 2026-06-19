"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Clock, Printer, Save, Trash2, Filter, Loader2, AlertCircle } from "lucide-react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { canAccessTab, defaultTabFor } from "@/lib/permissions";
import { getDbSafe, isFirebaseConfigured } from "@/lib/firebase";

const PAGE_ID = "jurnal-mengajar";

// Koleksi Firestore untuk jurnal mengajar. Realtime via onSnapshot, jadi
// status langsung tampil di Monitoring admin saat guru menyimpan jurnal.
const JOURNALS_COLLECTION = "teaching_journals";

// Koleksi data guru (Database > Data Guru). Dipakai untuk daftar Nama Guru.
const TEACHERS_COLLECTION = "teachers_data";

type Journal = {
  id: string;
  teacher: string;
  subject: string;
  class: string;
  date: string;
  jamKe: string;
  material: string;
  presentCount: string;
  absentCount: string;
  issues: string;
  status: string;
  createdAt: number;
};

const EMPTY_FORM = {
  teacher: "",
  subject: "",
  class: "",
  date: "",
  jamKe: "",
  material: "",
  presentCount: "",
  absentCount: "",
  issues: "",
};

function formatDate(value: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Minggu ke- dalam bulan (1-6), dihitung dari tanggal.
function weekOfMonth(d: Date) {
  return Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
}

export default function TeachingJournalPage() {
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const [activeTab, setActiveTab] = useState(() =>
    defaultTabFor(role, PAGE_ID, "jurnal")
  );
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // Filter laporan (Monitoring)
  const [filterWeek, setFilterWeek] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");

  const [journals, setJournals] = useState<Journal[]>([]);
  const [teacherNames, setTeacherNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Realtime sync daftar nama guru dari Database > Data Guru (teachers_data).
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(getDbSafe(), TEACHERS_COLLECTION), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const names = snap.docs
          .map((d) => (d.data() as { name?: string }).name?.trim())
          .filter((n): n is string => Boolean(n));
        // Unik, jaga-jaga ada nama ganda.
        setTeacherNames(Array.from(new Set(names)));
      },
      () => {
        /* abaikan — dropdown nama guru sekadar tidak terisi bila gagal */
      }
    );
    return () => unsub();
  }, []);

  // Guru: isi otomatis Nama Guru dengan namanya sendiri di form.
  useEffect(() => {
    if (role === "TEACHER" && user?.name) {
      setFormData((p) => (p.teacher === user.name ? p : { ...p, teacher: user.name }));
    }
  }, [role, user?.name]);

  // Realtime sync jurnal dari Firestore (lintas perangkat).
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setError("Firebase belum dikonfigurasi.");
      setLoading(false);
      return;
    }

    const q = query(collection(getDbSafe(), JOURNALS_COLLECTION), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Journal[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Journal, "id">),
        }));
        setJournals(rows);
        setLoading(false);
      },
      () => {
        setError("Gagal memuat jurnal. Periksa koneksi atau izin akses.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(getDbSafe(), JOURNALS_COLLECTION), {
        ...formData,
        status: "SUDAH",
        createdAt: Date.now(),
      });
      // Tidak perlu setJournals manual — onSnapshot otomatis memperbarui.
      setFormData({ ...EMPTY_FORM });
      setActiveTab("jurnal");
    } catch {
      setError("Gagal menyimpan jurnal. Periksa koneksi internet.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus jurnal ini?")) return;
    try {
      await deleteDoc(doc(getDbSafe(), JOURNALS_COLLECTION, id));
    } catch {
      setError("Gagal menghapus jurnal.");
    }
  };

  // Daftar tahun untuk dropdown laporan: 2026–2030.
  const availableYears = [2026, 2027, 2028, 2029, 2030];

  // Daftar nama guru dari Database > Data Guru (terintegrasi, realtime).
  const availableTeachers = teacherNames;

  // Pilihan Nama Guru di form:
  // - ADMIN: semua guru terdaftar.
  // - GURU: hanya dirinya sendiri (sesuai data di database admin).
  const formTeacherOptions =
    role === "ADMIN"
      ? availableTeachers
      : availableTeachers.filter((t) => t === user?.name);

  // Terapkan filter minggu/bulan/tahun ke data jurnal.
  const filteredJournals = journals.filter((j) => {
    const teacherMatch = !filterTeacher || j.teacher === filterTeacher;
    const d = new Date(j.date);
    if (isNaN(d.getTime())) {
      // Tanpa tanggal valid: hanya tampil bila tidak ada filter tanggal aktif.
      return teacherMatch && !filterWeek && !filterMonth && !filterYear;
    }
    const yearMatch = !filterYear || d.getFullYear() === Number(filterYear);
    const monthMatch = !filterMonth || d.getMonth() === Number(filterMonth);
    const weekMatch = !filterWeek || weekOfMonth(d) === Number(filterWeek);
    return teacherMatch && yearMatch && monthMatch && weekMatch;
  });

  const resetFilter = () => {
    setFilterWeek("");
    setFilterMonth("");
    setFilterYear("");
    setFilterTeacher("");
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {canAccessTab(role, PAGE_ID, "jurnal") && (
            <button
              onClick={() => setActiveTab("jurnal")}
              className={`${
                activeTab === "jurnal"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Monitoring Jurnal Mengajar
            </button>
          )}
          {canAccessTab(role, PAGE_ID, "format") && (
            <button
              onClick={() => setActiveTab("format")}
              className={`${
                activeTab === "format"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Format Jurnal Mengajar
            </button>
          )}
        </nav>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Content: Monitoring */}
      {activeTab === "jurnal" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Monitoring Jurnal Mengajar</h3>
              <p className="text-sm text-gray-500">Rekap kegiatan belajar mengajar harian</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                <Printer size={18} />
                Cetak Laporan
              </button>
              <button onClick={() => setActiveTab("format")} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                <Plus size={18} />
                Tambah Jurnal
              </button>
            </div>
          </div>

          {/* Filter Laporan */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Laporan:</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Minggu ke-</label>
                <select
                  value={filterWeek}
                  onChange={(e) => setFilterWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Semua Minggu</option>
                  {[1, 2, 3, 4, 5, 6].map((w) => (
                    <option key={w} value={w}>Minggu ke-{w}</option>
                  ))}
                </select>
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
                <label className="text-xs text-gray-500">Nama Guru</label>
                <select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Semua Guru</option>
                  {availableTeachers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {(filterWeek || filterMonth || filterYear || filterTeacher) && (
                <button
                  onClick={resetFilter}
                  className="self-end px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reset Filter
                </button>
              )}

              <div className="ml-auto self-end text-sm text-gray-500">
                Menampilkan <span className="font-semibold text-gray-800">{filteredJournals.length}</span> jurnal
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jam ke-</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Materi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hadir</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tidak Hadir</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Catatan / Kendala</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-400 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Memuat jurnal...
                      </span>
                    </td>
                  </tr>
                )}
                {!loading && filteredJournals.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-400 text-sm">
                      {journals.length === 0
                        ? "Belum ada jurnal. Isi lewat tab \"Format Jurnal Mengajar\"."
                        : "Tidak ada jurnal untuk filter laporan yang dipilih."}
                    </td>
                  </tr>
                )}
                {!loading && filteredJournals.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 font-medium text-gray-800 whitespace-nowrap">{item.teacher}</td>
                    <td className="px-6 py-4 text-gray-600">{item.subject || "-"}</td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{item.class}</td>
                    <td className="px-6 py-4 text-gray-600">{item.jamKe ? `Jam ke-${item.jamKe}` : "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{item.material}</td>
                    <td className="px-6 py-4 text-gray-600">{item.presentCount || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{item.absentCount || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{item.issues || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.status === "SUDAH"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.status === "SUDAH" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-100 rounded-lg"
                        title="Hapus"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Format */}
      {activeTab === "format" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Format Jurnal Mengajar</h3>
              <p className="text-sm text-gray-500">Isi jurnal mengajar — data tersimpan dan tampil di Monitoring</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Template Jurnal Mengajar</h4>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Nama Guru</label>
                  <select
                    required
                    value={formData.teacher}
                    onChange={(e) => setFormData((p) => ({ ...p, teacher: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Pilih guru</option>
                    {formTeacherOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Masukkan mata pelajaran"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Kelas</label>
                  <input
                    type="text"
                    required
                    value={formData.class}
                    onChange={(e) => setFormData((p) => ({ ...p, class: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Masukkan kelas"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Jam ke-</label>
                <select
                  required
                  value={formData.jamKe}
                  onChange={(e) => setFormData((p) => ({ ...p, jamKe: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Pilih jam pelajaran</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((jam) => (
                    <option key={jam} value={jam}>Jam ke-{jam}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Materi Pembelajaran</label>
                <textarea
                  required
                  value={formData.material}
                  onChange={(e) => setFormData((p) => ({ ...p, material: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Masukkan materi pembelajaran"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah Siswa Hadir</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.presentCount}
                    onChange={(e) => setFormData((p) => ({ ...p, presentCount: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah Siswa Tidak Hadir</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.absentCount}
                    onChange={(e) => setFormData((p) => ({ ...p, absentCount: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Catatan / Kendala</label>
                <textarea
                  value={formData.issues}
                  onChange={(e) => setFormData((p) => ({ ...p, issues: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Masukkan catatan atau kendala"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...EMPTY_FORM,
                      teacher: role === "TEACHER" ? (user?.name ?? "") : "",
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? "Menyimpan..." : "Simpan Jurnal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
