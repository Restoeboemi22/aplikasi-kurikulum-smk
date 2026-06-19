"use client";

import { useState } from "react";
import { Plus, Edit, CheckCircle2, Clock, Printer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccessTab, defaultTabFor } from "@/lib/permissions";

const PAGE_ID = "jurnal-mengajar";

export default function TeachingJournalPage() {
  const { user } = useAuth();
  const role = user?.role ?? "TEACHER";
  const [activeTab, setActiveTab] = useState(() =>
    defaultTabFor(role, PAGE_ID, "jurnal")
  );
  const [journals] = useState([
    { id: 1, date: "12 Juni 2024", teacher: "Pak Budi", class: "X TKJ 1", subject: "Pemrograman Dasar", material: "Variabel dan Tipe Data", presentCount: 32, issues: "Tidak ada", status: "SUDAH" },
    { id: 2, date: "12 Juni 2024", teacher: "Bu Siti", class: "X TKJ 1", subject: "Basis Data", material: "SQL Query Dasar", presentCount: 30, issues: "Beberapa siswa terlambat", status: "BELUM" },
  ]);

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

      {/* Tab Content */}
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
              <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                <Plus size={18} />
                Tambah Jurnal
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Guru</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Kelas</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Materi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Jumlah Hadir</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {journals.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{item.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.teacher}</td>
                    <td className="px-6 py-4 text-gray-600">{item.class}</td>
                    <td className="px-6 py-4 text-gray-600">{item.material}</td>
                    <td className="px-6 py-4 text-gray-600">{item.presentCount}</td>
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
                      <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                        Lihat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "format" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Format Jurnal Mengajar</h3>
              <p className="text-sm text-gray-500">Template dan format standar jurnal mengajar</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Template Jurnal Mengajar</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Nama Guru</label>
                  <input type="text" className="px-4 py-2 border border-gray-300 rounded-lg" placeholder="Masukkan nama guru" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Mata Pelajaran</label>
                  <input type="text" className="px-4 py-2 border border-gray-300 rounded-lg" placeholder="Masukkan mata pelajaran" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Kelas</label>
                  <input type="text" className="px-4 py-2 border border-gray-300 rounded-lg" placeholder="Masukkan kelas" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tanggal</label>
                  <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Materi Pembelajaran</label>
                <textarea className="px-4 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="Masukkan materi pembelajaran" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah Siswa Hadir</label>
                  <input type="number" className="px-4 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Jumlah Siswa Tidak Hadir</label>
                  <input type="number" className="px-4 py-2 border border-gray-300 rounded-lg" placeholder="0" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Catatan / Kendala</label>
                <textarea className="px-4 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="Masukkan catatan atau kendala" />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Reset
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Unduh Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
