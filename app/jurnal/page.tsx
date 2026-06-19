"use client";

import { useState } from "react";
import { Plus, Edit, CheckCircle2, Clock } from "lucide-react";

export default function JournalPage() {
  const [journals] = useState([
    { id: 1, date: "12 Juni 2024", teacher: "Pak Budi", class: "X TKJ 1", subject: "Pemrograman Dasar", material: "Variabel dan Tipe Data", presentCount: 32, issues: "Tidak ada", status: "SUDAH" },
    { id: 2, date: "12 Juni 2024", teacher: "Bu Siti", class: "X TKJ 1", subject: "Basis Data", material: "SQL Query Dasar", presentCount: 30, issues: "Beberapa siswa terlambat", status: "BELUM" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Jurnal Mengajar</h3>
          <p className="text-sm text-gray-500">Rekap kegiatan belajar mengajar harian</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
          <Plus size={18} />
          Tambah Jurnal
        </button>
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
  );
}
