"use client";

import { useState } from "react";
import { Plus, Download } from "lucide-react";

export default function GradesPage() {
  const [grades] = useState([
    { id: 1, studentName: "Andi Pratama", class: "X TKJ 1", subject: "Pemrograman Dasar", daily: 85, midterm: 80, final: 88, practical: 90, finalScore: 86, predicate: "A", completion: "Tuntas" },
    { id: 2, studentName: "Budi Santoso", class: "X TKJ 1", subject: "Pemrograman Dasar", daily: 70, midterm: 75, final: 72, practical: 68, finalScore: 71, predicate: "C", completion: "Belum Tuntas" },
    { id: 3, studentName: "Siti Aminah", class: "X TKJ 1", subject: "Pemrograman Dasar", daily: 92, midterm: 88, final: 95, practical: 94, finalScore: 92, predicate: "A", completion: "Tuntas" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Penilaian Siswa</h3>
          <p className="text-sm text-gray-500">Kelola nilai harian, UTS, UAS, dan rapor</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
            <Plus size={18} />
            Input Nilai
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nama Siswa</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kelas</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Mata Pelajaran</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Harian</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">UTS</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">UAS</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Praktik</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Nilai Akhir</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Predikat</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Ketuntasan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grades.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.studentName}</td>
                <td className="px-4 py-3 text-gray-600">{item.class}</td>
                <td className="px-4 py-3 text-gray-600">{item.subject}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.daily}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.midterm}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.final}</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.practical}</td>
                <td className="px-4 py-3 text-center font-bold text-primary-600">{item.finalScore}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                    item.predicate === "A" ? "bg-green-100 text-green-700" :
                    item.predicate === "B" ? "bg-blue-100 text-blue-700" :
                    item.predicate === "C" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {item.predicate}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    item.completion === "Tuntas"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {item.completion}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
