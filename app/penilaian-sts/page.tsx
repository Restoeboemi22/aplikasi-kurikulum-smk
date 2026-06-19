"use client";

import { useState } from "react";
import { Plus, Download, Edit, Trash2, Calendar } from "lucide-react";

export default function MidSemesterPage() {
  const [exams] = useState([
    { id: 1, startDate: "15 Juli 2024", endDate: "20 Juli 2024", semester: "Ganjil", academicYear: "2024/2025", status: "Terjadwal" },
    { id: 2, startDate: "15 Januari 2024", endDate: "20 Januari 2024", semester: "Genap", academicYear: "2023/2024", status: "Selesai" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">STS (Sumatif Tengah Semester)</h3>
          <p className="text-sm text-gray-500">Kelola penilaian tengah semester</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
            <Plus size={18} />
            Tambah STS
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal Mulai</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tanggal Selesai</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Semester</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tahun Ajaran</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {exams.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-600">{item.startDate}</td>
                <td className="px-6 py-4 text-gray-600">{item.endDate}</td>
                <td className="px-6 py-4 text-gray-600">{item.semester}</td>
                <td className="px-6 py-4 text-gray-800 font-medium">{item.academicYear}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${item.status === "Selesai" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-blue-100 rounded-lg">
                      <Edit size={16} className="text-blue-600" />
                    </button>
                    <button className="p-2 hover:bg-red-100 rounded-lg">
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
